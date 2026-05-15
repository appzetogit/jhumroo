import mongoose from 'mongoose';
import dotenv from 'dotenv';
import StaticPage from './models/StaticPage.model.js';

dotenv.config();

const seedStaticPages = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const pages = [
      {
        slug: 'terms-and-condition',
        title: 'Terms & Condition',
        content: `
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing and using Jhumroo, you agree to be bound by these Terms and Conditions. If you do not agree to all of these terms, do not use the service.</p>
          
          <h2>2. User Content</h2>
          <p>You are responsible for the content you post on Jhumroo. You grant Jhumroo a non-exclusive, royalty-free license to use, copy, and display your content.</p>
          
          <h2>3. Prohibited Conduct</h2>
          <p>Users may not engage in any activity that is illegal, harmful, or violates the rights of others. This includes harassment, spamming, and distribution of malware.</p>
          
          <h2>4. Limitation of Liability</h2>
          <p>Jhumroo is provided "as is" without any warranties. We are not liable for any damages arising from your use of the service.</p>
        `
      },
      {
        slug: 'privacy-policy',
        title: 'Privacy Policy',
        content: `
          <h2>1. Information We Collect</h2>
          <p>We collect information you provide directly to us, such as your profile information and content you post. We also collect device information and usage data.</p>
          
          <h2>2. How We Use Information</h2>
          <p>We use the information we collect to provide, maintain, and improve our services, and to personalize your experience.</p>
          
          <h2>3. Data Sharing</h2>
          <p>We do not sell your personal data. We may share information with service providers who help us operate the service.</p>
          
          <h2>4. Your Choices</h2>
          <p>You can manage your privacy settings and delete your account at any time through the settings menu.</p>
        `
      }
    ];

    for (const page of pages) {
      await StaticPage.findOneAndUpdate(
        { slug: page.slug },
        page,
        { upsert: true, new: true }
      );
      console.log(`Seeded/Updated page: ${page.slug}`);
    }

    console.log('Static pages seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding static pages:', error);
    process.exit(1);
  }
};

seedStaticPages();
