/**
 * Seed script for The Space Between
 *
 * Usage: npx tsx scripts/seed.ts
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SEED_COACH_PASSWORD (default: "testpass123")
 *   SEED_CLIENT_PASSWORD (default: "testpass123")
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const COACH_EMAIL = 'rich@thespacebetween.coach'
const CLIENT_EMAIL = 'alex@example.com'
const COACH_PASSWORD = process.env.SEED_COACH_PASSWORD || 'testpass123'
const CLIENT_PASSWORD = process.env.SEED_CLIENT_PASSWORD || 'testpass123'

async function seed() {
  console.log('Seeding The Space Between...')

  // Check if already seeded
  const { data: existingProfiles } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)

  if (existingProfiles && existingProfiles.length > 0) {
    console.log('Database already has data. Skipping seed.')
    return
  }

  // Create coach user
  const { data: coachAuth, error: coachError } = await supabase.auth.admin.createUser({
    email: COACH_EMAIL,
    password: COACH_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Rich Smith', role: 'admin' },
  })
  if (coachError) throw new Error(`Coach creation failed: ${coachError.message}`)
  const coachId = coachAuth.user.id
  console.log(`Created coach: ${COACH_EMAIL} (${coachId})`)

  // Create client user
  const { data: clientAuth, error: clientError } = await supabase.auth.admin.createUser({
    email: CLIENT_EMAIL,
    password: CLIENT_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Alex', role: 'client' },
  })
  if (clientError) throw new Error(`Client creation failed: ${clientError.message}`)
  const clientId = clientAuth.user.id
  console.log(`Created client: ${CLIENT_EMAIL} (${clientId})`)

  // Wait for profile trigger
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Create container (6 weeks ago start)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 42) // 6 weeks ago
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 49) // ~7 weeks from now (3 month container)

  const { data: container, error: containerError } = await supabase
    .from('containers')
    .insert({
      coach_id: coachId,
      client_id: clientId,
      title: "Alex's engagement",
      status: 'active',
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    })
    .select()
    .single()

  if (containerError) throw new Error(`Container creation failed: ${containerError.message}`)
  console.log(`Created container: ${container.id}`)

  // Seed entries
  const entries = [
    { author_id: coachId, daysAgo: 42, content: "We're starting with the compound question today. What do you want to do all day, and what will it take to have that life? I'm not looking for an answer. I'm looking for what comes up when you sit with it. What's alive for you right now?" },
    { author_id: clientId, daysAgo: 40, content: "I've been sitting with the question and the honest answer is I don't know what I want to do all day. I know what I'm good at. I know what people pay me for. I know what my calendar looks like. But 'what do I want to do all day' is a different question and I don't have a clean answer. What keeps coming up is that most of my day is spent on things I'm competent at but don't care about. The things I care about get the margins." },
    { author_id: coachId, daysAgo: 35, content: "'The things I care about get the margins.' That's worth staying with. What are those things? Not the category. The specific thing you did this week that you cared about." },
    { author_id: clientId, daysAgo: 32, content: "Tuesday afternoon I spent two hours working through a problem with Jamie on my team. Not a work problem. A development problem. She's trying to figure out whether to take the promotion or leave for the startup. We sat with it and I realized I was more present in that conversation than I'd been in any meeting all week. That's the thing I care about. Helping someone think through a real question." },
    { author_id: clientId, daysAgo: 26, content: "Something happened at the leadership offsite that connects to what I wrote last week. I watched myself perform for three hours. I was competent, articulate, and completely checked out. On the drive home I realized the gap isn't between my job and some other job. The gap is between the version of me that showed up at the offsite and the version of me that showed up with Jamie." },
    { author_id: coachId, daysAgo: 23, content: "You're naming something specific. The version of you that was present with Jamie and the version of you that performed at the offsite. That's not about the job. That's about which version of you gets to run the day. Stay with that." },
    { author_id: clientId, daysAgo: 18, content: "I've been noticing the performance all week. It's everywhere. In meetings, on calls, even at dinner with my partner. I'm performing competence and the performance is exhausting and I don't think anyone is asking me to do it. I think I'm asking me to do it. The compound question is starting to feel less like 'what job do I want' and more like 'what would it look like to stop performing and start showing up.'" },
    { author_id: coachId, daysAgo: 14, content: "That's a real shift. The question moved from external (what job) to internal (what way of being). The second clause of the compound question might be more alive now too. 'What will it take to have that life' might not be about logistics. It might be about permission." },
    { author_id: clientId, daysAgo: 10, content: "Permission. Yes. I've been thinking about what it would take and the answer that keeps coming back is: I would have to let people see me not know things. The performance is a competence shield. Dropping it means being visible in a way I haven't been. That's terrifying and also the only thing that sounds like relief." },
    { author_id: coachId, daysAgo: 5, content: "We're six weeks in and the compound question has a different shape than it did on day one. The first clause has moved from 'I don't know what I want' to 'I want to be present, not performing.' The second clause has moved from logistics to permission. That's the arc so far. What do you want to do with the back half of this engagement?" },
  ]

  for (const entry of entries) {
    const createdAt = new Date()
    createdAt.setDate(createdAt.getDate() - entry.daysAgo)

    await supabase.from('entries').insert({
      container_id: container.id,
      author_id: entry.author_id,
      content: entry.content,
      created_at: createdAt.toISOString(),
    })
  }
  console.log(`Created ${entries.length} entries`)

  // Seed reflections
  const reflections = [
    {
      daysAgo: 41,
      what_shifted: "Alex came in thinking this was about finding a different job. By the end of the session, the compound question had unsettled that assumption. He couldn't answer it and that was the first useful thing that happened.",
      what_unnamed: "There's a heaviness when Alex talks about his calendar. Not frustration. Something closer to resignation. He hasn't named it yet.",
      compound_question_now: "Planted but not yet alive. Alex is holding it intellectually, not somatically.",
    },
    {
      daysAgo: 34,
      what_shifted: "The Jamie conversation was the first time Alex identified a specific moment of presence vs absence. He went from abstract ('things I care about') to concrete ('two hours with Jamie on Tuesday'). That's the work starting.",
      what_unnamed: "Alex lit up talking about Jamie's question. He doesn't see yet that he's describing himself as a coach. He thinks he's describing himself as a good manager.",
      compound_question_now: "The first clause is getting traction. 'What do I want to do all day' is now connected to a real memory, not an abstraction.",
    },
    {
      daysAgo: 25,
      what_shifted: "The offsite was the crack. Alex watched himself perform and saw it for the first time. The gap he named -- between the offsite version and the Jamie version -- is the whole engagement. Everything else will come from this.",
      what_unnamed: "The performance is a protection, not a habit. Alex is performing competence because he's afraid of what's underneath. He's not ready to hear this yet.",
      compound_question_now: "Moving from 'what job' to 'what way of being.' The question is getting personal.",
    },
    {
      daysAgo: 17,
      what_shifted: "Alex is seeing the performance everywhere now. Meetings, calls, dinner. The pattern is visible. He named the most important thing: 'I think I'm asking me to do it.' Nobody is requiring the performance. He is choosing it.",
      what_unnamed: "The exhaustion. Alex described the performance as exhausting but hasn't connected it to the compound question's second clause. 'What will it take' might be 'stop doing this to myself.'",
      compound_question_now: "Fully reframed. No longer about logistics. Now about identity.",
    },
    {
      daysAgo: 9,
      what_shifted: "Permission. Alex named the thing: he would have to let people see him not know things. The competence shield is the obstacle. Dropping it is terrifying and the only thing that sounds like relief. Both of those are true at the same time and he's holding both.",
      what_unnamed: "Alex said 'relief' but his body language said something stronger. This might be grief for the years spent performing. He's not there yet.",
      compound_question_now: "The second clause is alive. 'What will it take to have that life' = 'what will it take to let people see me.'",
    },
    {
      daysAgo: 4,
      what_shifted: "I reflected the arc back to him. He could see it. The movement from 'I don't know what I want' to 'I want to be present, not performing' happened over six weeks and he lived it in real time but couldn't see it until I laid it out.",
      what_unnamed: "He's ready for the back half. The question for the next six weeks is whether he can practice dropping the shield in real situations, not just naming that it exists.",
      compound_question_now: "Answered at the first-draft level. First clause: presence over performance. Second clause: permission to be visible. Both need to be lived, not just known.",
    },
  ]

  for (const reflection of reflections) {
    const createdAt = new Date()
    createdAt.setDate(createdAt.getDate() - reflection.daysAgo)

    await supabase.from('reflections').insert({
      container_id: container.id,
      coach_id: coachId,
      what_shifted: reflection.what_shifted,
      what_unnamed: reflection.what_unnamed,
      compound_question_now: reflection.compound_question_now,
      created_at: createdAt.toISOString(),
    })
  }
  console.log(`Created ${reflections.length} reflections`)

  // Create a mock subscription for the coach
  await supabase.from('subscriptions').insert({
    coach_id: coachId,
    stripe_customer_id: 'cus_seed_demo',
    stripe_subscription_id: 'sub_seed_demo',
    status: 'active',
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  })
  console.log('Created mock subscription')

  console.log('\nSeed complete!')
  console.log(`Coach login: ${COACH_EMAIL} / ${COACH_PASSWORD}`)
  console.log(`Client login: ${CLIENT_EMAIL} / ${CLIENT_PASSWORD}`)
}

seed().catch(console.error)
