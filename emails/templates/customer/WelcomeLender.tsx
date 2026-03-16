import * as React from 'react';
import {
  Html, Head, Preview, Body, Container, Section, Text, Link, Hr,
} from '@react-email/components';

interface WelcomeLenderProps {
  customerFirstName: string;
  lenderFirstName: string;
  lenderLastName: string;
  lenderPhone: string;
  lenderEmail: string;
  companyName: string;
  nmlsId: string;
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

export default function WelcomeLender({
  customerFirstName,
  lenderFirstName,
  lenderLastName,
  lenderPhone,
  lenderEmail,
  companyName,
  nmlsId,
}: WelcomeLenderProps) {
  return (
    <Html>
      <Head />
      <Preview>Your VeteranPCS Lender: {lenderFirstName} {lenderLastName}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={{ ...styles.text, fontWeight: 'bold', fontSize: '20px' }}>VeteranPCS</Text>
          <Hr style={styles.hr} />

          <Text style={styles.text}>
            Hi {customerFirstName},
          </Text>

          <Text style={styles.text}>
            Thank you for choosing VeteranPCS! We're excited to connect you with one of our trusted
            mortgage professionals who specializes in VA loans and military lending.
          </Text>

          <Text style={styles.sectionHeading}>YOUR LENDER</Text>

          <Section style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
            <Text style={{ ...styles.text, fontWeight: 'bold', margin: '0 0 4px' }}>
              {lenderFirstName} {lenderLastName}
            </Text>
            <Text style={{ ...styles.text, margin: '0 0 4px' }}>{companyName}</Text>
            <Text style={{ ...styles.text, margin: '0 0 4px' }}>NMLS# {nmlsId}</Text>
            <Text style={{ ...styles.text, margin: '0 0 4px' }}>
              Phone: <Link href={`tel:${lenderPhone}`} style={styles.link}>{lenderPhone}</Link>
            </Text>
            <Text style={{ ...styles.text, margin: '0' }}>
              Email: <Link href={`mailto:${lenderEmail}`} style={styles.link}>{lenderEmail}</Link>
            </Text>
          </Section>

          <Text style={styles.sectionHeading}>WHAT HAPPENS NEXT</Text>

          <Text style={styles.text}>
            1. {lenderFirstName} will reach out to you within the next 24-48 hours to discuss your
            financing options and answer any questions.
          </Text>

          <Text style={styles.text}>
            2. Be on the lookout for a call, text, or email from {lenderFirstName}.
          </Text>

          <Text style={styles.text}>
            3. If you don't hear back within 48 hours, please let us know at{' '}
            <Link href="mailto:info@veteranpcs.com" style={styles.link}>info@veteranpcs.com</Link>{' '}
            and we'll follow up on your behalf.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>ABOUT {lenderFirstName.toUpperCase()}</Text>

          <Text style={styles.text}>
            {lenderFirstName} is a verified member of the VeteranPCS lender network, specializing
            in VA loans and military lending. Our lenders understand BAH, deployment considerations,
            and the unique financial situations of military families.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>VA LOAN BENEFITS</Text>

          <Text style={styles.text}>
            As a veteran or active duty service member, you may be eligible for:
          </Text>

          <Text style={styles.text}>
            - $0 down payment on your home purchase{'\n'}
            - No private mortgage insurance (PMI){'\n'}
            - Competitive interest rates{'\n'}
            - Flexible credit requirements
          </Text>

          <Text style={styles.text}>
            {lenderFirstName} can help you understand your VA loan eligibility and options.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.text}>
            Thank you for your service, and we look forward to helping you achieve your
            homeownership goals!
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
