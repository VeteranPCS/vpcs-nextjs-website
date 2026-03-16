import * as React from "react";
import { Section, Text, Link, Hr } from "@react-email/components";

export const Footer: React.FC = () => {
  return (
    <Section style={footerSection}>
      <Hr style={divider} />
      <Text style={tagline}>VeteranPCS | Serving Those Who Served</Text>
      <Text style={links}>
        <Link href="https://veteranpcs.com" style={link}>
          veteranpcs.com
        </Link>
        {" | "}
        <Link href="mailto:info@veteranpcs.com" style={link}>
          info@veteranpcs.com
        </Link>
      </Text>
    </Section>
  );
};

const footerSection: React.CSSProperties = {
  padding: "0 32px 24px 32px",
};

const divider: React.CSSProperties = {
  borderColor: "#e8e8e8",
  borderTop: "1px solid #e8e8e8",
  margin: "0 0 20px 0",
};

const tagline: React.CSSProperties = {
  color: "#999999",
  fontSize: "13px",
  textAlign: "center" as const,
  margin: "0 0 8px 0",
};

const links: React.CSSProperties = {
  color: "#999999",
  fontSize: "12px",
  textAlign: "center" as const,
  margin: 0,
};

const link: React.CSSProperties = {
  color: "#999999",
  textDecoration: "underline",
};

export default Footer;
