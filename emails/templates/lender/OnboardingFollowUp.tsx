import * as React from 'react';
import {
  Html, Head, Preview, Body, Container, Section, Text, Link, Hr,
} from '@react-email/components';

interface OnboardingFollowUpProps {
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

export default function OnboardingFollowUp({ firstName }: OnboardingFollowUpProps) {
  return (
    <Html>
      <Head />
      <Preview>Following Up on Your VeteranPCS Lender Application</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={{ ...styles.text, fontWeight: 'bold', fontSize: '20px' }}>VeteranPCS</Text>
          <Hr style={styles.hr} />

          <Text style={styles.text}>
            Hi {firstName},
          </Text>

          <Text style={styles.text}>
            We wanted to follow up on your VeteranPCS lender application. We haven't heard from
            you in a little while and wanted to make sure our previous email didn't get lost in
            your inbox.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>QUICK RECAP</Text>

          <Text style={styles.text}>
            You started an application to join the VeteranPCS lender network. We'd love to move
            forward with the process and learn more about how you serve military families with
            VA loans.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>NEXT STEPS</Text>

          <Text style={styles.text}>
            If you're still interested in joining our network, please reply to this email and
            let us know the best time to connect for a brief introductory call.
          </Text>

          <Text style={styles.text}>
            If your circumstances have changed or you're no longer interested, no worries at
            all - just let us know and we'll close out your application.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>WHY JOIN VETERANPCS?</Text>

          <Text style={styles.text}>
            - <strong>Qualified Leads:</strong> Connect with veterans and military families actively
            seeking VA financing{'\n'}
            - <strong>State Coverage:</strong> Be featured on state pages where you're licensed{'\n'}
            - <strong>Community:</strong> Join a network of professionals dedicated to serving
            military families{'\n'}
            - <strong>Give Back:</strong> Every transaction supports veteran-focused charities
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.text}>
            We'd hate to lose you from our pipeline, so please reach out if you have any
            questions or concerns.
          </Text>

          <Text style={styles.text}>
            Looking forward to hearing from you!
          </Text>

          <Text style={styles.text}>
            Best regards,
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
