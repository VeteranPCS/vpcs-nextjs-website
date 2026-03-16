import * as React from 'react';
import {
  Html, Head, Preview, Body, Container, Section, Text, Link, Hr,
} from '@react-email/components';

interface ContactConfirmationProps {
  customerFirstName: string;
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

export default function ContactConfirmation({ customerFirstName }: ContactConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>Thank you for contacting VeteranPCS - we'll be in touch shortly</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={{ ...styles.text, fontWeight: 'bold', fontSize: '20px' }}>VeteranPCS</Text>
          <Hr style={styles.hr} />

          <Text style={styles.text}>
            Hi {customerFirstName},
          </Text>

          <Text style={styles.text}>
            Thank you for reaching out to VeteranPCS. We received your message and a member of our
            team will be in touch with you shortly.
          </Text>

          <Text style={styles.text}>
            At VeteranPCS, we connect veterans, active duty service members, and military families
            with trusted real estate agents and lenders who understand the unique needs of military life.
          </Text>

          <Text style={styles.text}>
            One of our team members will personally follow up with you to learn more about your
            situation and connect you with the right professional for your needs.
          </Text>

          <Text style={styles.text}>
            In the meantime, feel free to explore our{' '}
            <Link href="https://veteranpcs.com" style={styles.link}>website</Link>{' '}
            to learn more about our mission and the services we offer.
          </Text>

          <Text style={styles.text}>
            Thank you for your service, and we look forward to helping you with your real estate journey.
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
