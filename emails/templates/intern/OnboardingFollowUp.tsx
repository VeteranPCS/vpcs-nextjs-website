import * as React from 'react';
import {
  Html, Head, Preview, Body, Container, Section, Text, Link, Hr,
} from '@react-email/components';

interface OnboardingFollowUpProps {
  firstName: string;
  internshipType: string;
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

export default function OnboardingFollowUp({ firstName, internshipType }: OnboardingFollowUpProps) {
  return (
    <Html>
      <Head />
      <Preview>Following Up on Your VeteranPCS Internship Application</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={{ ...styles.text, fontWeight: 'bold', fontSize: '20px' }}>VeteranPCS</Text>
          <Hr style={styles.hr} />

          <Text style={styles.text}>
            Hi {firstName},
          </Text>

          <Text style={styles.text}>
            We wanted to follow up on your VeteranPCS internship application. We haven't heard
            from you in a little while and wanted to check in.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>QUICK RECAP</Text>

          <Text style={styles.text}>
            You applied to join the VeteranPCS Internship Program to pursue a career in{' '}
            {internshipType}. We'd love to move forward with the process and learn more about
            your goals.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>NEXT STEPS</Text>

          <Text style={styles.text}>
            If you're still interested in the internship program, please reply to this email and
            let us know:
          </Text>

          <Text style={styles.text}>
            1. The best time to connect for an introductory call{'\n'}
            2. Any updates to your timeline or preferred location{'\n'}
            3. Any questions you have about the program
          </Text>

          <Text style={styles.text}>
            If your plans have changed or you're no longer interested, no worries at all - just
            let us know and we'll close out your application.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>WHAT TO EXPECT</Text>

          <Text style={styles.text}>
            Our internship program is designed to help transitioning service members like you
            build a successful career in real estate or lending. We'll match you with an
            experienced mentor who can guide you through:
          </Text>

          <Text style={styles.text}>
            - Licensing requirements{'\n'}
            - Initial training and education{'\n'}
            - Your first clients and transactions{'\n'}
            - Building your business
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.text}>
            We'd love to help you on your journey, so please reach out when you have a chance.
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
