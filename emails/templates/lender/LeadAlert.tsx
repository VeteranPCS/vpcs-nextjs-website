import * as React from 'react';
import {
  Html, Head, Preview, Body, Container, Section, Text, Link, Hr,
} from '@react-email/components';

interface LeadAlertProps {
  lenderFirstName: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone: string;
  customerEmail: string;
  destinationCity: string;
  destinationState: string;
  militaryStatus: string;
  notes: string | null;
  magicLink: string;
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

export default function LeadAlert({
  lenderFirstName,
  customerFirstName,
  customerLastName,
  customerPhone,
  customerEmail,
  destinationCity,
  destinationState,
  militaryStatus,
  notes,
  magicLink,
}: LeadAlertProps) {
  return (
    <Html>
      <Head />
      <Preview>New Lead from VeteranPCS - Please Reply When Received</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={{ ...styles.text, fontWeight: 'bold', fontSize: '20px' }}>VeteranPCS</Text>
          <Hr style={styles.hr} />

          <Text style={styles.text}>
            Hi {lenderFirstName},
          </Text>

          <Text style={styles.text}>
            Great news! You have a new lead from VeteranPCS.
          </Text>

          <Section style={{ backgroundColor: '#fef3c7', padding: '16px', borderRadius: '8px', border: '1px solid #f59e0b' }}>
            <Text style={{ ...styles.text, fontWeight: 'bold', margin: '0', textAlign: 'center' as const }}>
              PLEASE REPLY TO THIS EMAIL TO CONFIRM YOU RECEIVED THIS LEAD.
            </Text>
          </Section>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>LEAD DETAILS</Text>

          <Section style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
            <Text style={{ ...styles.text, margin: '0 0 4px' }}>
              <strong>Name:</strong> {customerFirstName} {customerLastName}
            </Text>
            <Text style={{ ...styles.text, margin: '0 0 4px' }}>
              <strong>Phone:</strong>{' '}
              <Link href={`tel:${customerPhone}`} style={styles.link}>{customerPhone}</Link>
            </Text>
            <Text style={{ ...styles.text, margin: '0 0 4px' }}>
              <strong>Email:</strong>{' '}
              <Link href={`mailto:${customerEmail}`} style={styles.link}>{customerEmail}</Link>
            </Text>
            <Text style={{ ...styles.text, margin: '0 0 4px' }}>
              <strong>Destination:</strong> {destinationCity}, {destinationState}
            </Text>
            <Text style={{ ...styles.text, margin: '0' }}>
              <strong>Military Status:</strong> {militaryStatus}
            </Text>
          </Section>

          {notes && (
            <>
              <Text style={styles.sectionHeading}>ADDITIONAL NOTES</Text>
              <Text style={styles.text}>{notes}</Text>
            </>
          )}

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>NEXT STEPS</Text>

          <Text style={styles.text}>
            1. Contact {customerFirstName} within 24 hours - First impressions matter!
          </Text>

          <Text style={styles.text}>
            2. <Link href={magicLink} style={styles.link}>Click here to confirm you received this lead</Link>
          </Text>

          <Text style={styles.text}>
            3. Update the lead status when you make contact
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>IMPORTANT REMINDER</Text>

          <Text style={styles.text}>
            VeteranPCS customers expect prompt, professional service. If you're unable to work
            with this lead, please let us know immediately so we can reassign to another lender.
          </Text>

          <Text style={styles.text}>
            If we don't hear from you within 48 hours, the lead may be reassigned.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.text}>
            Thank you for being part of the VeteranPCS network!
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
