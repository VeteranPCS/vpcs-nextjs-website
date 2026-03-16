import * as React from 'react';
import {
  Html, Head, Preview, Body, Container, Section, Text, Link, Hr,
} from '@react-email/components';

interface OnboardingWelcomeProps {
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

export default function OnboardingWelcome({ firstName }: OnboardingWelcomeProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to VeteranPCS - Thank You for Your Lender Application</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={{ ...styles.text, fontWeight: 'bold', fontSize: '20px' }}>VeteranPCS</Text>
          <Hr style={styles.hr} />

          <Text style={styles.text}>
            Hi {firstName},
          </Text>

          <Text style={styles.text}>
            Thank you for your interest in joining the VeteranPCS lender network! We're excited to
            learn more about you and how we can work together to serve military families.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>WHAT IS VETERANPCS?</Text>

          <Text style={styles.text}>
            VeteranPCS is a veteran-owned platform that connects military families with trusted
            real estate and mortgage professionals. Our lenders specialize in VA loans and understand
            the unique financial situations of service members.
          </Text>

          <Text style={styles.text}>
            By joining our network, you'll have the opportunity to:
          </Text>

          <Text style={styles.text}>
            - Receive qualified leads from veterans and military families seeking financing{'\n'}
            - Be featured on our state pages as a trusted VA loan specialist{'\n'}
            - Connect with a community of like-minded professionals{'\n'}
            - Give back to veterans through our charity program
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>WHAT HAPPENS NEXT</Text>

          <Text style={styles.text}>
            1. <strong>Application Review</strong> - Our team will review your application within
            2-3 business days
          </Text>

          <Text style={styles.text}>
            2. <strong>Verification</strong> - We'll verify your NMLS licensing and credentials
          </Text>

          <Text style={styles.text}>
            3. <strong>Agreement</strong> - If approved, we'll send you our partnership agreement
            to sign
          </Text>

          <Text style={styles.text}>
            4. <strong>Go Live</strong> - Once complete, you'll be listed on our website and
            eligible for leads
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>IN THE MEANTIME</Text>

          <Text style={styles.text}>
            Feel free to explore our website and learn more about our mission:{'\n'}
            - <Link href="https://veteranpcs.com" style={styles.link}>Website</Link>{'\n'}
            - <Link href="https://veteranpcs.com/about" style={styles.link}>About Us</Link>
          </Text>

          <Text style={styles.text}>
            If you have any questions, don't hesitate to reach out to us at{' '}
            <Link href="mailto:info@veteranpcs.com" style={styles.link}>info@veteranpcs.com</Link>.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.text}>
            We look forward to potentially welcoming you to the VeteranPCS family!
          </Text>

          <Text style={styles.text}>
            Warm regards,
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
