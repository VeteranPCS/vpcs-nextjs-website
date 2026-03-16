import * as React from 'react';
import {
  Html, Head, Preview, Body, Container, Section, Text, Link, Hr,
} from '@react-email/components';

interface LiveOnWebsiteProps {
  firstName: string;
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

export default function LiveOnWebsite({ firstName }: LiveOnWebsiteProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to VeteranPCS - You're Now Live!</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={{ ...styles.text, fontWeight: 'bold', fontSize: '20px' }}>VeteranPCS</Text>
          <Hr style={styles.hr} />

          <Text style={styles.text}>
            Hi {firstName},
          </Text>

          <Text style={{ ...styles.text, fontWeight: 'bold', fontSize: '20px' }}>
            CONGRATULATIONS AND WELCOME TO THE VETERANPCS LENDER NETWORK!
          </Text>

          <Text style={styles.text}>
            Your profile is now live on our website, and you're ready to start receiving leads
            from veterans and military families seeking VA financing.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>YOUR LIVE PROFILE</Text>

          <Text style={styles.text}>
            You're now listed on the state pages where you're licensed to lend. Please take a
            moment to review your profile and let us know if anything needs to be updated.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>WHAT TO EXPECT</Text>

          <Text style={styles.text}>
            <strong>Leads:</strong> When a veteran or military family requests a lender in your
            coverage area, you'll receive an email with their contact information. Please respond
            promptly - first impressions matter!
          </Text>

          <Text style={styles.text}>
            <strong>Response Time:</strong> We ask that you contact new leads within 24 hours
            and reply to our lead notification email to confirm receipt.
          </Text>

          <Text style={styles.text}>
            <strong>Updates:</strong> Keep us informed of any changes to your contact information,
            licensed states, or availability.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>TIPS FOR SUCCESS</Text>

          <Text style={styles.text}>
            1. <strong>Respond Quickly</strong> - The first lender to respond often wins the client
          </Text>

          <Text style={styles.text}>
            2. <strong>Educate</strong> - Many veterans don't fully understand their VA loan
            benefits - help them!
          </Text>

          <Text style={styles.text}>
            3. <strong>Communicate</strong> - Keep your clients (and us) informed throughout the
            loan process
          </Text>

          <Text style={styles.text}>
            4. <strong>Give Back</strong> - Remember that every closed transaction supports
            veteran charities
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>QUESTIONS?</Text>

          <Text style={styles.text}>
            We're always here to help. Reach out anytime at{' '}
            <Link href="mailto:info@veteranpcs.com" style={styles.link}>info@veteranpcs.com</Link>.
          </Text>

          <Text style={styles.text}>
            Thank you for joining our mission to serve those who served!
          </Text>

          <Text style={styles.text}>
            Welcome to the team,
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
