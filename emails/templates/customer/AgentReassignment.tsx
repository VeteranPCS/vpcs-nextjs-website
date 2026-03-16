import * as React from 'react';
import {
  Html, Head, Preview, Body, Container, Section, Text, Link, Hr,
} from '@react-email/components';

interface AgentReassignmentProps {
  customerFirstName: string;
  newAgentFirstName: string;
  newAgentLastName: string;
  newAgentPhone: string;
  newAgentEmail: string;
  brokerageName: string;
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

export default function AgentReassignment({
  customerFirstName,
  newAgentFirstName,
  newAgentLastName,
  newAgentPhone,
  newAgentEmail,
  brokerageName,
}: AgentReassignmentProps) {
  return (
    <Html>
      <Head />
      <Preview>We've connected you with a new VeteranPCS agent</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={{ ...styles.text, fontWeight: 'bold', fontSize: '20px' }}>VeteranPCS</Text>
          <Hr style={styles.hr} />

          <Text style={styles.text}>
            Hi {customerFirstName},
          </Text>

          <Text style={styles.text}>
            We've connected you with a new agent to make sure you receive the prompt, professional
            service you deserve. We apologize for any delay and want to ensure your real estate
            journey stays on track.
          </Text>

          <Text style={styles.sectionHeading}>YOUR NEW AGENT</Text>

          <Section style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
            <Text style={{ ...styles.text, fontWeight: 'bold', margin: '0 0 4px' }}>
              {newAgentFirstName} {newAgentLastName}
            </Text>
            <Text style={{ ...styles.text, margin: '0 0 4px' }}>{brokerageName}</Text>
            <Text style={{ ...styles.text, margin: '0 0 4px' }}>
              Phone: <Link href={`tel:${newAgentPhone}`} style={styles.link}>{newAgentPhone}</Link>
            </Text>
            <Text style={{ ...styles.text, margin: '0' }}>
              Email: <Link href={`mailto:${newAgentEmail}`} style={styles.link}>{newAgentEmail}</Link>
            </Text>
          </Section>

          <Text style={styles.sectionHeading}>WHAT HAPPENS NEXT</Text>

          <Text style={styles.text}>
            1. {newAgentFirstName} will reach out to you within the next 24-48 hours to introduce
            themselves and learn more about your real estate needs.
          </Text>

          <Text style={styles.text}>
            2. Be on the lookout for a call, text, or email from {newAgentFirstName}.
          </Text>

          <Text style={styles.text}>
            3. If you don't hear back within 48 hours, please let us know at{' '}
            <Link href="mailto:info@veteranpcs.com" style={styles.link}>info@veteranpcs.com</Link>{' '}
            and we'll follow up on your behalf.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>ABOUT {newAgentFirstName.toUpperCase()}</Text>

          <Text style={styles.text}>
            {newAgentFirstName} is a verified member of the VeteranPCS network, committed to providing
            exceptional service to veterans and military families. All of our agents understand
            VA loans, PCS moves, and the unique challenges of military life.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.text}>
            Thank you for your patience, and thank you for your service. We're committed to
            connecting you with the right professional for your needs.
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
