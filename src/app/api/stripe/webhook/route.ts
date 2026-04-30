import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

function getSubscriptionPeriodEnd(sub: Stripe.Subscription): string {
  // Stripe v22+ may return current_period_end as number or nested object
  const end = (sub as unknown as Record<string, unknown>).current_period_end
  if (typeof end === 'number') {
    return new Date(end * 1000).toISOString()
  }
  return new Date().toISOString()
}

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string
      const email = session.customer_email || session.customer_details?.email

      if (subscriptionId && email) {
        const sub = await getStripe().subscriptions.retrieve(subscriptionId)

        // Match by looking up auth users
        const { data: authUsers } = await supabase.auth.admin.listUsers()
        const user = authUsers?.users?.find(u => u.email === email)

        if (user) {
          await supabase.from('subscriptions').upsert({
            coach_id: user.id,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: sub.status === 'active' ? 'active' : sub.status === 'trialing' ? 'trialing' : 'past_due',
            current_period_end: getSubscriptionPeriodEnd(sub),
          }, { onConflict: 'stripe_subscription_id' })
        }
      }
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const statusMap: Record<string, string> = {
        active: 'active',
        past_due: 'past_due',
        canceled: 'canceled',
        trialing: 'trialing',
      }
      await supabase
        .from('subscriptions')
        .update({
          status: statusMap[sub.status] || 'canceled',
          current_period_end: getSubscriptionPeriodEnd(sub),
        })
        .eq('stripe_subscription_id', sub.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
