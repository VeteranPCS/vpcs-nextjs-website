import * as React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Preview,
} from "@react-email/components";
import { Footer } from "./Footer";

interface LayoutProps {
  children: React.ReactNode;
  previewText?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, previewText }) => {
  return (
    <Html>
      <Head />
      {previewText && <Preview>{previewText}</Preview>}
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerText}>VeteranPCS</Text>
          </Section>
          <Section style={content}>{children}</Section>
          <Footer />
        </Container>
      </Body>
    </Html>
  );
};

const body: React.CSSProperties = {
  backgroundColor: "#f6f6f6",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  maxWidth: "600px",
  margin: "0 auto",
  padding: "0",
  borderRadius: "4px",
  border: "1px solid #e8e8e8",
};

const header: React.CSSProperties = {
  backgroundColor: "#1a3a5c",
  padding: "24px 32px",
  borderRadius: "4px 4px 0 0",
};

const headerText: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: 700,
  margin: 0,
  textAlign: "center" as const,
  letterSpacing: "0.5px",
};

const content: React.CSSProperties = {
  padding: "32px",
};

export default Layout;
