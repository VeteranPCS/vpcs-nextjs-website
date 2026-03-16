import * as React from 'react';
import {
  Html, Head, Preview, Body, Container, Section, Text, Link, Hr,
} from '@react-email/components';

interface TransactionClosedProps {
  customerFirstName: string;
  moveInBonus: string;
  charityAmount: string;
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

export default function TransactionClosed({
  customerFirstName,
  moveInBonus,
  charityAmount,
}: TransactionClosedProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome Home! Your VeteranPCS Move-In Bonus Details</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={{ ...styles.text, fontWeight: 'bold', fontSize: '20px' }}>VeteranPCS</Text>
          <Hr style={styles.hr} />

          <Text style={styles.text}>
            Hi {customerFirstName},
          </Text>

          <Text style={{ ...styles.text, fontWeight: 'bold', fontSize: '20px' }}>
            WELCOME TO YOUR NEW HOME!
          </Text>

          <Text style={styles.text}>
            Congratulations on closing! This is an incredible achievement, and the entire VeteranPCS
            team is honored to have been part of your journey.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>YOUR VETERANPCS MOVE-IN BONUS</Text>

          <Text style={styles.text}>
            As promised, here are the details of your Move-In Bonus:
          </Text>

          <Section style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
            <Text style={{ ...styles.text, fontWeight: 'bold', margin: '0 0 4px' }}>
              Bonus Amount: ${moveInBonus}
            </Text>
            <Text style={{ ...styles.text, margin: '0' }}>
              Charity Donation: ${charityAmount} donated in your honor
            </Text>
          </Section>

          <Text style={styles.text}>
            Your bonus check will be mailed to your new address within 2-3 weeks of closing.
            The charity donation will be made to a veteran-focused organization on your behalf.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>HELP OTHER VETERANS</Text>

          <Text style={styles.text}>
            Your experience can help other military families make informed decisions. Would you
            take a moment to share your experience?
          </Text>

          <Text style={styles.text}>
            <strong>Leave a Review:</strong>{'\n'}
            - <Link href="https://g.page/veteranpcs/review" style={styles.link}>Google</Link>{'\n'}
            - <Link href="https://facebook.com/veteranpcs/reviews" style={styles.link}>Facebook</Link>
          </Text>

          <Text style={styles.text}>
            Your feedback helps us continue serving the military community and helps other veterans
            find trusted professionals.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>REFER A FRIEND</Text>

          <Text style={styles.text}>
            Know another veteran or military family who could benefit from VeteranPCS? Send them
            our way! Every referral helps us grow our mission of serving those who served.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.sectionHeading}>STAY CONNECTED</Text>

          <Text style={styles.text}>
            Follow us on social media to stay connected with the VeteranPCS community:{'\n'}
            - <Link href="https://facebook.com/veteranpcs" style={styles.link}>Facebook: @VeteranPCS</Link>{'\n'}
            - <Link href="https://instagram.com/veteranpcs" style={styles.link}>Instagram: @VeteranPCS</Link>
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.text}>
            Thank you for trusting VeteranPCS with your real estate journey. We wish you all the
            best in your new home!
          </Text>

          <Text style={styles.text}>
            With gratitude,
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
