import * as React from 'react';
import {
  Html, Head, Preview, Body, Container, Section, Text, Link, Hr,
} from '@react-email/components';

interface UnderContractProps {
  customerFirstName: string;
  agentFirstName: string;
  agentLastName: string;
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

export default function UnderContract({
  customerFirstName,
  agentFirstName,
  agentLastName,
}: UnderContractProps) {
  return (
    <Html>
      <Head />
      <Preview>Congratulations - You're Under Contract!</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={{ ...styles.text, fontWeight: 'bold', fontSize: '20px' }}>VeteranPCS</Text>
          <Hr style={styles.hr} />

          <Text style={styles.text}>
            Hi {customerFirstName},
          </Text>

          <Text style={{ ...styles.text, fontWeight: 'bold', fontSize: '20px' }}>
            CONGRATULATIONS!
          </Text>

          <Text style={styles.text}>
            We heard the exciting news - you're under contract on your new home!
          </Text>

          <Text style={styles.text}>
            This is a huge milestone, and we're thrilled to have been part of your journey.
            The VeteranPCS team wants to celebrate this achievement with you.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>WHAT TO EXPECT NEXT</Text>

          <Text style={styles.text}>
            1. <strong>Home Inspection</strong> - Your agent will help coordinate the inspection process
          </Text>

          <Text style={styles.text}>
            2. <strong>Appraisal</strong> - Required for VA loans to ensure the home meets value requirements
          </Text>

          <Text style={styles.text}>
            3. <strong>Final Walkthrough</strong> - One last look before closing day
          </Text>

          <Text style={styles.text}>
            4. <strong>Closing Day</strong> - Sign the papers and get your keys!
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>YOUR VETERANPCS MOVE-IN BONUS</Text>

          <Text style={styles.text}>
            As a thank you for using VeteranPCS, you'll receive a Move-In Bonus after your
            transaction closes! The amount is based on your home's sale price, and we'll send
            you details once the transaction is complete.
          </Text>

          <Text style={styles.text}>
            We'll also make a donation to a veteran-focused charity in your honor.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>QUESTIONS?</Text>

          <Text style={styles.text}>
            Your agent {agentFirstName} {agentLastName} is your best resource during this time.
            Don't hesitate to reach out to them with any questions.
          </Text>

          <Text style={styles.text}>
            If you need anything from the VeteranPCS team, we're always here at{' '}
            <Link href="mailto:info@veteranpcs.com" style={styles.link}>info@veteranpcs.com</Link>.
          </Text>

          <Text style={styles.text}>
            Congratulations again, and thank you for your service!
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
