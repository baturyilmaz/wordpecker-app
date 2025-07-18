import { connectDB } from '../config/mongodb';
import { Template } from '../api/templates/model';

const templateData = [
  {
    name: "Essential Business English",
    description: "Master key vocabulary for professional communication, meetings, and presentations in the business world.",
    context: "business and professional communication",
    category: "Business",
    difficulty: "intermediate" as const,
    tags: ["business", "professional", "workplace", "communication"],
    featured: true,
    words: [
      { value: "stakeholder", meaning: "a person or organization with an interest or concern in a business" },
      { value: "leverage", meaning: "to use something effectively to achieve a desired result" },
      { value: "synergy", meaning: "the combined effect that is greater than the sum of individual parts" },
      { value: "paradigm", meaning: "a typical example or pattern of something; a model" },
      { value: "scalable", meaning: "able to be changed in size or scale" },
      { value: "pivotal", meaning: "of crucial importance in relation to development or success" },
      { value: "streamline", meaning: "to make an organization or system more efficient by simplifying working methods" },
      { value: "benchmark", meaning: "a standard or point of reference against which things may be compared" },
      { value: "milestone", meaning: "a significant stage or event in the development of something" },
      { value: "revenue", meaning: "income generated from normal business operations" },
      { value: "logistics", meaning: "the detailed coordination of complex operations involving many people" },
      { value: "facilitate", meaning: "to make an action or process easier or help bring about" },
      { value: "consolidate", meaning: "to combine multiple things into a single more effective unit" },
      { value: "procurement", meaning: "the action of obtaining or procuring something, especially supplies" },
      { value: "collaborative", meaning: "involving two or more parties working together" }
    ]
  },
  {
    name: "Academic IELTS Vocabulary",
    description: "High-frequency academic words essential for IELTS Writing and Reading tasks to boost your band score.",
    context: "academic writing and IELTS preparation",
    category: "Academic",
    difficulty: "advanced" as const,
    tags: ["ielts", "academic", "writing", "university"],
    featured: true,
    words: [
      { value: "analyze", meaning: "to examine methodically and in detail the constitution or structure of something" },
      { value: "synthesize", meaning: "to combine a number of things into a coherent whole" },
      { value: "hypothesis", meaning: "a supposition or proposed explanation made on the basis of limited evidence" },
      { value: "empirical", meaning: "based on, concerned with, or verifiable by observation or experience" },
      { value: "methodology", meaning: "a system of methods used in a particular area of study or activity" },
      { value: "criterion", meaning: "a principle or standard by which something may be judged or decided" },
      { value: "coherent", meaning: "logical and consistent; clearly articulated" },
      { value: "comprehensive", meaning: "complete and including everything that is necessary" },
      { value: "contemporary", meaning: "existing at or occurring in the same period of time" },
      { value: "correlation", meaning: "a mutual relationship or connection between two or more things" },
      { value: "inherent", meaning: "existing as a natural or basic part of something" },
      { value: "predominant", meaning: "present as the strongest or main element" },
      { value: "subsequent", meaning: "coming after something in time; following" },
      { value: "constitute", meaning: "to be a part of a whole; to form or compose" },
      { value: "phenomenon", meaning: "a fact or situation that is observed to exist or happen" }
    ]
  },
  {
    name: "Daily Conversation Starters",
    description: "Essential vocabulary for everyday English conversations, perfect for beginners building confidence.",
    context: "daily conversations and social interactions",
    category: "General",
    difficulty: "beginner" as const,
    tags: ["conversation", "daily", "social", "beginner"],
    featured: false,
    words: [
      { value: "appreciate", meaning: "to recognize the full worth of something; to be grateful for" },
      { value: "recommend", meaning: "to suggest that someone or something would be good or suitable for a purpose" },
      { value: "familiar", meaning: "well-known from long or close association; easily recognized" },
      { value: "convenient", meaning: "fitting in well with a person's needs, activities, and plans" },
      { value: "opportunity", meaning: "a set of circumstances that makes it possible to do something" },
      { value: "experience", meaning: "practical contact with and observation of facts or events" },
      { value: "necessary", meaning: "required to be done, achieved, or present; essential" },
      { value: "several", meaning: "more than two but not very many" },
      { value: "particular", meaning: "used to emphasize that one is referring to a specific person or thing" },
      { value: "available", meaning: "able to be used or obtained; at someone's disposal" },
      { value: "similar", meaning: "resembling without being identical; having characteristics in common" },
      { value: "different", meaning: "not the same as another; distinct in nature or quality" },
      { value: "wonderful", meaning: "inspiring delight, pleasure, or admiration; excellent" },
      { value: "important", meaning: "of great significance or value; having serious meaning" },
      { value: "interesting", meaning: "arousing curiosity or interest; holding or catching attention" }
    ]
  },
  {
    name: "Science & Technology Terms",
    description: "Modern vocabulary for understanding technology, innovation, and scientific concepts in today's world.",
    context: "science, technology, and innovation",
    category: "Science",
    difficulty: "intermediate" as const,
    tags: ["science", "technology", "innovation", "modern"],
    featured: false,
    words: [
      { value: "algorithm", meaning: "a process or set of rules to be followed in calculations or problem-solving" },
      { value: "artificial intelligence", meaning: "computer systems able to perform tasks that normally require human intelligence" },
      { value: "blockchain", meaning: "a digital ledger in which transactions are recorded across many computers" },
      { value: "cybersecurity", meaning: "the practice of protecting systems and networks from digital attacks" },
      { value: "automation", meaning: "the use of largely automatic equipment in a system of operation" },
      { value: "innovation", meaning: "the action or process of innovating; a new method, idea, or product" },
      { value: "sustainable", meaning: "able to be maintained at a certain rate or level without depleting resources" },
      { value: "biotechnology", meaning: "the exploitation of biological processes for industrial purposes" },
      { value: "nanotechnology", meaning: "the manipulation of matter on an atomic and molecular scale" },
      { value: "renewable", meaning: "capable of being replaced by natural processes" },
      { value: "ecosystem", meaning: "a biological community of interacting organisms and their environment" },
      { value: "optimize", meaning: "to make the best or most effective use of a situation or resource" },
      { value: "prototype", meaning: "a first or preliminary version of a device from which others are developed" },
      { value: "interface", meaning: "a point where two systems meet and interact" },
      { value: "virtual", meaning: "not physically existing but made by software to appear to do so" }
    ]
  },
  {
    name: "Travel & Culture Explorer",
    description: "Essential words for travelers exploring new cultures, places, and experiences around the world.",
    context: "travel, tourism, and cultural experiences",
    category: "Travel",
    difficulty: "beginner" as const,
    tags: ["travel", "culture", "tourism", "exploration"],
    featured: false,
    words: [
      { value: "destination", meaning: "the place to which someone or something is going or being sent" },
      { value: "itinerary", meaning: "a planned route or journey; a travel schedule" },
      { value: "accommodation", meaning: "a room, group of rooms, or building where someone may live or stay" },
      { value: "reservation", meaning: "the action of booking something in advance" },
      { value: "cuisine", meaning: "a style or method of cooking characteristic of a particular region" },
      { value: "heritage", meaning: "valued objects and qualities such as historic buildings and cultural traditions" },
      { value: "landmark", meaning: "an object or feature easily recognized from a distance" },
      { value: "souvenir", meaning: "a thing that is kept as a reminder of a person, place, or event" },
      { value: "excursion", meaning: "a short journey or trip, especially for pleasure" },
      { value: "luggage", meaning: "suitcases or other bags for a traveler's belongings" },
      { value: "passport", meaning: "an official document permitting travel abroad" },
      { value: "customs", meaning: "the official department that administers duties on imported goods" },
      { value: "embassy", meaning: "the official residence of an ambassador" },
      { value: "currency", meaning: "a system of money in general use in a particular country" },
      { value: "adventure", meaning: "an unusual and exciting or daring experience" }
    ]
  },
  {
    name: "Healthcare & Medicine Basics",
    description: "Important medical vocabulary for understanding health topics, visiting doctors, and wellness discussions.",
    context: "healthcare, medicine, and wellness",
    category: "Health",
    difficulty: "intermediate" as const,
    tags: ["health", "medical", "wellness", "healthcare"],
    featured: false,
    words: [
      { value: "diagnosis", meaning: "the identification of the nature of illness through examination of symptoms" },
      { value: "prescription", meaning: "a doctor's written instruction for medicine to be prepared and used" },
      { value: "symptom", meaning: "a physical or mental feature indicating a condition of disease" },
      { value: "treatment", meaning: "medical care given to a patient for illness or injury" },
      { value: "prevention", meaning: "the action of stopping something from happening or arising" },
      { value: "vaccination", meaning: "treatment with a vaccine to produce immunity against disease" },
      { value: "recovery", meaning: "a return to normal state of health, mind, or strength" },
      { value: "chronic", meaning: "persisting for a long time or constantly recurring" },
      { value: "acute", meaning: "having a sudden onset, sharp rise, and short course" },
      { value: "therapy", meaning: "treatment intended to relieve or heal a disorder" },
      { value: "nutrition", meaning: "the process of providing or obtaining food necessary for health" },
      { value: "immune", meaning: "protected against a particular disease by particular substances in the blood" },
      { value: "allergy", meaning: "a damaging immune response by the body to a substance" },
      { value: "epidemic", meaning: "a widespread occurrence of an infectious disease in a community" },
      { value: "wellness", meaning: "the state of being in good health, especially as an actively pursued goal" }
    ]
  }
];

async function seedTemplates() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    
    console.log('Clearing existing templates...');
    await Template.deleteMany({});
    
    console.log('Seeding templates...');
    await Template.insertMany(templateData);
    
    console.log(`Successfully seeded ${templateData.length} templates!`);
    
    // Display summary
    const categories = await Template.distinct('category');
    const totalWords = templateData.reduce((sum, template) => sum + template.words.length, 0);
    
    console.log('\n=== SEEDING SUMMARY ===');
    console.log(`Templates created: ${templateData.length}`);
    console.log(`Total words: ${totalWords}`);
    console.log(`Categories: ${categories.join(', ')}`);
    console.log(`Featured templates: ${templateData.filter(t => t.featured).length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding templates:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedTemplates();
}

export { seedTemplates };