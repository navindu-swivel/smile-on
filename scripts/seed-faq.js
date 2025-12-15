const { OpenAIEmbeddings } = require('@langchain/openai');
const { PineconeStore } = require('@langchain/pinecone');
const { Pinecone } = require('@pinecone-database/pinecone');
const { Document } = require('@langchain/core/documents');
require('dotenv').config({ path: '.env.local' });

const FAQ_DATA = `
CLINIC DETAILS & LOCATION

1. Where are you located?

Answer:
Smile On Clinics operates multiple locations across NSW, QLD, and the ACT. Simply tell me your suburb, and I’ll direct you to the closest practice with full address and directions.


---

2. Do you have parking available?

Answer:
Most Smile On Clinics locations offer convenient on-site or nearby parking. If you tell me which clinic you plan to visit, I can confirm the parking options for you.


---

3. How can I contact the clinic?

Answer:
Each Smile On Clinics practice has its own dedicated reception team. If you let me know your preferred location, I can provide the correct phone number and email — or arrange for the team to contact you directly.


---

4. Are you close to public transport?

Answer:
Several Smile On Clinics practices are located near train stations or major bus routes. Tell me which clinic you’re visiting and I’ll provide specific public transport information.


---


---

OPENING HOURS

5. What are your opening hours?

Answer:
Opening hours vary slightly between Smile On Clinics locations, but most practices operate Monday to Saturday with early and late appointments available. If you share your preferred clinic, I can give you the exact hours.


---

6. Are you open on Saturdays?

Answer:
Yes — many Smile On Clinics locations offer Saturday appointments. I can check availability at your nearest clinic.


---

7. Do you offer after-hours appointments?

Answer:
Selected Smile On Clinics practices offer early morning or late afternoon appointments. Let me know your preferred clinic and I’ll check the next available options.


---


---

BOOKING APPOINTMENTS

8. How do I book an appointment?

Answer:
You can book online 24/7, call your preferred Smile On Clinics location, or I can help you make a booking right now.


---

9. Can I book an appointment online?

Answer:
Yes — Smile On Clinics offers easy, secure online booking available anytime. It only takes a moment to reserve your preferred time.


---

10. Can I book an emergency appointment?

Answer:
Yes. If you’re in pain or experiencing a dental emergency, we prioritise same-day or next-day appointments where possible. I can check availability immediately.


---

11. Do I need a referral?

Answer:
No referral is required. You can book directly with any Smile On Clinics dentist or specialist.


---

12. Can I reschedule or cancel my appointment?

Answer:
Yes — simply contact your clinic or use the online booking system. We kindly ask for at least 24 hours’ notice where possible.


---


---

DENTISTS & STAFF

13. Which dentists work at your clinic?

Answer:
Smile On Clinics is home to a large team of general dentists, oral health therapists, and specialists. If you tell me your preferred location or treatment, I can recommend the right clinician.


---

14. Can I choose my dentist?

Answer:
Absolutely. Many patients have a preferred dentist, and we’re happy to accommodate your request.


---

15. Do you have female dentists?

Answer:
Yes — across our clinics we have both male and female dentists available.


---

16. Do you have specialists?

Answer:
Yes. Smile On Clinics includes or partners with specialists such as orthodontists, periodontists, endodontists, prosthodontists, and oral surgeons. I can help you find the right clinician for your needs.


---


---

SERVICES & TREATMENTS

17. What dental services do you offer?

Answer:
Smile On Clinics provides a full range of general, cosmetic, restorative, and emergency dental services — including check-ups, cleans, whitening, Invisalign, implants, crowns, root canal treatment, wisdom teeth removal, and children’s dentistry.


---

18. Do you offer teeth whitening?

Answer:
Yes — we offer professional in-chair whitening as well as take-home whitening kits. I can help you book a consultation to see which option suits you best.


---

19. Do you do Invisalign or braces?

Answer:
Yes. Many Smile On Clinics dentists provide Invisalign clear aligners, and orthodontic services are also available at selected locations. A consultation will confirm the best treatment for your smile.


---

20. Do you treat children?

Answer:
Yes — we provide gentle children’s dentistry and support families across all our clinics. Many locations also offer the Child Dental Benefits Schedule (CDBS) for eligible families.


---


---

COSTS & INSURANCE

21. How much does a check-up cost?

Answer:
Fees vary slightly by location, but Smile On Clinics offers competitive pricing and transparent treatment plans. I can check the exact fee for your nearest clinic.


---

22. Do you accept health insurance?

Answer:
Yes — all Smile On Clinics practices accept all major Australian private health funds, with on-the-spot HICAPS claiming.


---

23. Do you offer payment plans?

Answer:
Yes — we offer flexible payment options, including interest-free plans for eligible treatments such as Invisalign, implants, and cosmetic procedures.


---


---

NEW PATIENTS

24. Are you accepting new patients?

Answer:
Yes — all Smile On Clinics locations are currently welcoming new patients.


---

25. What should I bring to my first appointment?

Answer:
Please bring a valid ID, your private health insurance card (if applicable), and any recent dental X-rays or relevant medical information.


---

26. How long does the first appointment take?

Answer:
A new patient appointment typically takes 45 to 60 minutes, depending on whether X-rays or additional assessments are needed.


---


---

COMFORT & ANXIETY

27. I’m nervous about seeing the dentist. Can you help?

Answer:
Absolutely. Smile On Clinics is known for gentle, patient-focused care. We take extra time with anxious patients and will tailor your appointment to your comfort level.


---

28. Do you offer sedation?

Answer:
Yes — selected Smile On Clinics locations provide sedation or other comfort options. We can discuss which options are available based on your treatment and location.


---


---

FOLLOW-UP & LOGISTICS

29. How soon can I get an appointment?

Answer:
Often within the same week — and for emergencies, usually same-day. I can check real-time availability for your closest clinic.


---

30. Can I speak to someone instead of chatting?

Answer:
Of course. I can arrange for your preferred clinic to call you, or provide the direct phone number so you can speak to reception immediately.
`;

async function seedFAQ() {
  // Initialize Pinecone and OpenAI
  if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
    console.error('Missing environment variables. Please check .env.local');
    process.exit(1);
  }

  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);
  const embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
  });

  console.log('Parsing FAQ data...');

  // Split by "---" to get sections/questions
  const rawSections = FAQ_DATA.split('---').map(s => s.trim()).filter(s => s.length > 0);
  
  const documents = [];

  for (const section of rawSections) {
    // Simple heuristic to clean up the text
    // Remove the "1. ", "2. " numbering if present at start of lines
    const cleanContent = section.replace(/^\d+\.\s*/gm, '');
    
    // Skip if it looks like just a header (e.g. "CLINIC DETAILS & LOCATION")
    // A real Q&A usually has "Answer:" in it
    if (!cleanContent.includes('Answer:')) {
        continue;
    }

    // Extract title/question for metadata if possible
    const lines = cleanContent.split('\n');
    const question = lines[0].trim();

    documents.push(new Document({
      pageContent: cleanContent,
      metadata: {
        source: 'faq',
        title: question,
        type: 'qa'
      }
    }));
  }

  console.log(`Found ${documents.length} Q&A pairs.`);

  if (documents.length > 0) {
    console.log('Upserting to Pinecone...');
    await PineconeStore.fromDocuments(documents, embeddings, {
      pineconeIndex,
      maxConcurrency: 5, // Batch requests
    });
    console.log('Successfully seeded FAQ data!');
  } else {
    console.log('No documents to seed.');
  }
}

seedFAQ().catch(console.error);
