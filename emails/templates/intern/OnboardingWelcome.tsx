import * as React from 'react';
import {
  Html, Head, Preview, Body, Container, Section, Text, Link, Hr,
} from '@react-email/components';

interface OnboardingWelcomeProps {
  firstName: string;
  internshipType: string;
  desiredCity: string;
  desiredState: string;
  preferredStartDate: string;
}

const styles = {
  body: { backgroundColor: '#ffffff', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' },
  container: { margin: '0 auto', padding: '20px 24px', maxWidth: '600px' },
  heading: { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '30px 0 20px' },
  text: { fontSize: '16px', lineHeight: '26px', color: '#333333' },
  sectionHeading: { fontSize: '14px', fontWeight: 'bold' as const, color: '#1a1a1a', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '24px 0 12px' },
  hr: { borderColor: '#e5e5e5', margin: '24px 0' },
  link: { color: '#2563eb' },
  footer: { fontSize: '13px', color: '#999999', lineHeight: '22px' },
};

export default function OnboardingWelcome({
  firstName,
  internshipType,
  desiredCity,
  desiredState,
  preferredStartDate,
}: OnboardingWelcomeProps) {
  return (
    <Html>
      <Head />
      <Preview>VeteranPCS Internship - Thank You for Your Application</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={{ ...styles.text, fontWeight: 'bold', fontSize: '20px' }}>VeteranPCS</Text>
          <Hr style={styles.hr} />

          <Text style={styles.text}>
            Hi {firstName},
          </Text>

          <Text style={styles.text}>
            Thank you for your interest in the VeteranPCS Internship Program! We're excited to
            learn more about you and explore how we can help you transition into a career in
            real estate or mortgage lending.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>ABOUT THE VETERANPCS INTERNSHIP PROGRAM</Text>

          <Text style={styles.text}>
            Our internship program connects transitioning service members with experienced agents
            and lenders in our network who can mentor you as you build your new career.
          </Text>

          <Text style={styles.text}>
            Whether you're interested in becoming a real estate agent or a mortgage lender, we'll
            work to match you with a mentor who can guide you through licensing, training, and
            your first transactions.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>WHAT HAPPENS NEXT</Text>

          <Text style={styles.text}>
            1. <strong>Application Review</strong> - Our team will review your application within
            3-5 business days
          </Text>

          <Text style={styles.text}>
            2. <strong>Initial Conversation</strong> - We'll schedule a call to learn more about
            your goals and timeline
          </Text>

          <Text style={styles.text}>
            3. <strong>Mentor Matching</strong> - Based on your preferences and location, we'll
            identify potential mentors
          </Text>

          <Text style={styles.text}>
            4. <strong>Introduction</strong> - Once a match is made, we'll introduce you to
            your mentor
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>WHAT WE RECEIVED</Text>

          <Text style={styles.text}>
            We have your application on file with the following details:
          </Text>

          <Section style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
            <Text style={{ ...styles.text, margin: '0 0 4px' }}>
              <strong>Internship Type:</strong> {internshipType}
            </Text>
            <Text style={{ ...styles.text, margin: '0 0 4px' }}>
              <strong>Desired Location:</strong> {desiredCity}, {desiredState}
            </Text>
            <Text style={{ ...styles.text, margin: '0' }}>
              <strong>Preferred Start Date:</strong> {preferredStartDate}
            </Text>
          </Section>

          <Text style={styles.text}>
            If any of this information needs to be updated, please reply to this email.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>IN THE MEANTIME</Text>

          <Text style={styles.text}>
            If you haven't already started the licensing process, now is a great time to research
            requirements in your desired state. Your mentor can provide more guidance, but getting
            a head start never hurts!
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.text}>
            We look forward to helping you on your journey from service member to real estate
            professional.
          </Text>

          <Text style={styles.text}>
            Thank you for your service,
          </Text>

          <Text style={styles.text}>The VeteranPCS Team</Text>

          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            VeteranPCS | Serving Those Who Served{'\n'}
            <Link href="https://veteranpcs.com" style={styles.link}>veteranpcs.com</Link>
            {' '} | info@veteranpcs.com
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
