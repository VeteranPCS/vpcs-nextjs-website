import * as React from 'react';
import {
  Html, Head, Preview, Body, Container, Section, Text, Link, Hr,
} from '@react-email/components';

interface ContractReadyProps {
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

export default function ContractReady({ firstName }: ContractReadyProps) {
  return (
    <Html>
      <Head />
      <Preview>Your VeteranPCS Partnership Agreement is Ready to Sign</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={{ ...styles.text, fontWeight: 'bold', fontSize: '20px' }}>VeteranPCS</Text>
          <Hr style={styles.hr} />

          <Text style={styles.text}>
            Hi {firstName},
          </Text>

          <Text style={styles.text}>
            Great news! Your VeteranPCS application has been approved, and we're ready to move forward.
          </Text>

          <Section style={{ backgroundColor: '#ecfdf5', padding: '16px', borderRadius: '8px', border: '1px solid #10b981' }}>
            <Text style={{ ...styles.text, fontWeight: 'bold', margin: '0', textAlign: 'center' as const }}>
              YOUR PARTNERSHIP AGREEMENT IS READY FOR SIGNATURE.
            </Text>
          </Section>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>NEXT STEPS</Text>

          <Text style={styles.text}>
            1. <strong>Review the Agreement</strong> - You'll receive a separate email from our
            e-signature provider (SignWell) with the agreement attached
          </Text>

          <Text style={styles.text}>
            2. <strong>Sign Electronically</strong> - The process takes just a few minutes
          </Text>

          <Text style={styles.text}>
            3. <strong>Complete Your Profile</strong> - Once signed, we'll need a few items to
            complete your listing:{'\n'}
            {'   '}- Professional headshot{'\n'}
            {'   '}- Brief bio (2-3 paragraphs about your VA loan experience){'\n'}
            {'   '}- States where you're licensed to lend
          </Text>

          <Text style={styles.text}>
            4. <strong>Go Live</strong> - Once everything is complete, you'll be listed on
            VeteranPCS and eligible to receive leads!
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>WHAT'S IN THE AGREEMENT</Text>

          <Text style={styles.text}>
            - Referral fee structure and payment terms{'\n'}
            - Lead handling expectations{'\n'}
            - Branding and marketing guidelines{'\n'}
            - Terms of partnership
          </Text>

          <Text style={styles.text}>
            If you have any questions about the agreement before signing, please don't hesitate
            to reach out to us.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>TIMELINE</Text>

          <Text style={styles.text}>
            Please sign the agreement within the next 7 days to keep your application moving
            forward. If you need more time or have concerns, just let us know.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.text}>
            We're excited to have you join the VeteranPCS lender network!
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
