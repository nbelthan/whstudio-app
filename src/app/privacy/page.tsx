'use client';

import { Card, Typography, Button } from '@worldcoin/mini-apps-ui-kit-react';
import { ArrowLeft, Mail, Shield, FileText, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={() => router.back()}
            variant="outline"
            size="sm"
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Typography variant="h2" className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Privacy Policy
          </Typography>
        </div>

        {/* Last Updated Notice */}
        <Card className="mb-6 p-4 bg-blue-50 border-blue-200">
          <Typography variant="body2" className="text-blue-800">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Typography>
        </Card>

        {/* Privacy Policy Content */}
        <div className="space-y-8">
          {/* Introduction */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Introduction</Typography>
            <Typography variant="body1" className="mb-4">
              WorldHuman Studio ("we," "our," or "us") is committed to protecting your privacy and ensuring the secure handling of your personal information. This Privacy Policy explains how we collect, use, store, and protect your data when you use our AI-powered data annotation platform.
            </Typography>
            <Typography variant="body1">
              By using WorldHuman Studio, you consent to the practices described in this Privacy Policy. We operate under a data minimization principle, collecting only the information necessary to provide our services.
            </Typography>
          </Card>

          {/* Data Collection */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Information We Collect</Typography>

            <div className="space-y-4">
              <div>
                <Typography variant="h4" className="mb-2">World ID Verification Data</Typography>
                <Typography variant="body1" className="mb-2">
                  • Verified World ID nullifier hash (anonymized identifier)
                </Typography>
                <Typography variant="body1" className="mb-2">
                  • Verification level (Orb-verified or Device-verified)
                </Typography>
                <Typography variant="body1" className="mb-2">
                  • Verification timestamp
                </Typography>
              </div>

              <div>
                <Typography variant="h4" className="mb-2">User Profile Information</Typography>
                <Typography variant="body1" className="mb-2">
                  • Username (self-selected display name)
                </Typography>
                <Typography variant="body1" className="mb-2">
                  • Wallet address (for payment processing)
                </Typography>
                <Typography variant="body1" className="mb-2">
                  • Account creation date
                </Typography>
              </div>

              <div>
                <Typography variant="h4" className="mb-2">Task and Submission Data</Typography>
                <Typography variant="body1" className="mb-2">
                  • Task completion data and responses
                </Typography>
                <Typography variant="body1" className="mb-2">
                  • RLHF (Reinforcement Learning from Human Feedback) annotations
                </Typography>
                <Typography variant="body1" className="mb-2">
                  • Data labeling submissions
                </Typography>
                <Typography variant="body1" className="mb-2">
                  • Quality scores and consensus data
                </Typography>
              </div>

              <div>
                <Typography variant="h4" className="mb-2">Technical Data</Typography>
                <Typography variant="body1" className="mb-2">
                  • Session information and authentication tokens
                </Typography>
                <Typography variant="body1" className="mb-2">
                  • App usage analytics (anonymized)
                </Typography>
                <Typography variant="body1" className="mb-2">
                  • Error logs and performance metrics
                </Typography>
              </div>
            </div>
          </Card>

          {/* How We Use Data */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">How We Use Your Information</Typography>

            <div className="space-y-3">
              <Typography variant="body1">
                <strong>Service Delivery:</strong> To provide task assignments, process submissions, and calculate earnings
              </Typography>
              <Typography variant="body1">
                <strong>Identity Verification:</strong> To ensure sybil resistance and maintain data quality through World ID
              </Typography>
              <Typography variant="body1">
                <strong>Payment Processing:</strong> To distribute rewards for completed tasks via blockchain transactions
              </Typography>
              <Typography variant="body1">
                <strong>Quality Assurance:</strong> To validate submissions and maintain high-quality training data
              </Typography>
              <Typography variant="body1">
                <strong>Platform Improvement:</strong> To analyze usage patterns and improve our services (anonymized data only)
              </Typography>
              <Typography variant="body1">
                <strong>Communication:</strong> To send important updates about your account and our services
              </Typography>
            </div>
          </Card>

          {/* Data Minimization */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Data Minimization Principle</Typography>
            <Typography variant="body1" className="mb-4">
              We adhere to strict data minimization practices:
            </Typography>
            <div className="space-y-2">
              <Typography variant="body1">• We collect only data necessary for platform functionality</Typography>
              <Typography variant="body1">• Personal identifiers are anonymized whenever possible</Typography>
              <Typography variant="body1">• We do not collect unnecessary personal information</Typography>
              <Typography variant="body1">• Data retention periods are minimized and clearly defined</Typography>
            </div>
          </Card>

          {/* Third-Party Services */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Third-Party Services</Typography>

            <div className="space-y-4">
              <div>
                <Typography variant="h4" className="mb-2">World App Integration</Typography>
                <Typography variant="body1" className="mb-2">
                  WorldHuman Studio operates as a Mini App within the World App ecosystem. Your World ID verification is processed by Worldcoin's secure infrastructure.
                </Typography>
                <Typography variant="body1">
                  Learn more: <a href="https://worldcoin.org/privacy" className="text-blue-600 underline">Worldcoin Privacy Policy</a>
                </Typography>
              </div>

              <div>
                <Typography variant="h4" className="mb-2">Vercel Hosting</Typography>
                <Typography variant="body1" className="mb-2">
                  Our platform is hosted on Vercel's infrastructure with enterprise-grade security measures.
                </Typography>
                <Typography variant="body1">
                  Learn more: <a href="https://vercel.com/legal/privacy-policy" className="text-blue-600 underline">Vercel Privacy Policy</a>
                </Typography>
              </div>

              <div>
                <Typography variant="h4" className="mb-2">Blockchain Networks</Typography>
                <Typography variant="body1">
                  Payment transactions are processed on public blockchain networks. Transaction data is publicly visible on the blockchain but does not contain personal information.
                </Typography>
              </div>
            </div>
          </Card>

          {/* Data Security */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Data Security</Typography>
            <Typography variant="body1" className="mb-4">
              We implement industry-standard security measures to protect your data:
            </Typography>
            <div className="space-y-2">
              <Typography variant="body1">• End-to-end encryption for sensitive data transmission</Typography>
              <Typography variant="body1">• Secure database storage with access controls</Typography>
              <Typography variant="body1">• Regular security audits and vulnerability assessments</Typography>
              <Typography variant="body1">• Multi-factor authentication for administrative access</Typography>
              <Typography variant="body1">• Data backup and disaster recovery procedures</Typography>
            </div>
          </Card>

          {/* Your Rights */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Your Privacy Rights</Typography>

            <div className="space-y-4">
              <div>
                <Typography variant="h4" className="mb-2">Access Rights</Typography>
                <Typography variant="body1">
                  You have the right to access all personal data we hold about you. Contact us to request a copy of your data.
                </Typography>
              </div>

              <div>
                <Typography variant="h4" className="mb-2">Deletion Rights</Typography>
                <Typography variant="body1">
                  You can request deletion of your personal data. Note that some data may be retained for legal compliance or legitimate business purposes.
                </Typography>
              </div>

              <div>
                <Typography variant="h4" className="mb-2">Data Portability</Typography>
                <Typography variant="body1">
                  You can request a machine-readable copy of your data to transfer to another service.
                </Typography>
              </div>

              <div>
                <Typography variant="h4" className="mb-2">Correction Rights</Typography>
                <Typography variant="body1">
                  You can request correction of inaccurate or incomplete personal data.
                </Typography>
              </div>

              <div>
                <Typography variant="h4" className="mb-2">Withdraw Consent</Typography>
                <Typography variant="body1">
                  You can withdraw your consent for data processing at any time by discontinuing use of our services.
                </Typography>
              </div>
            </div>
          </Card>

          {/* Data Retention */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Data Retention</Typography>
            <div className="space-y-3">
              <Typography variant="body1">
                <strong>User Account Data:</strong> Retained while your account is active and for 30 days after account deletion
              </Typography>
              <Typography variant="body1">
                <strong>Task Submissions:</strong> Retained for up to 2 years for quality assurance and model training purposes
              </Typography>
              <Typography variant="body1">
                <strong>Transaction Records:</strong> Retained for 7 years for financial compliance requirements
              </Typography>
              <Typography variant="body1">
                <strong>Analytics Data:</strong> Anonymized usage data retained for up to 1 year for service improvement
              </Typography>
            </div>
          </Card>

          {/* International Transfers */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">International Data Transfers</Typography>
            <Typography variant="body1" className="mb-4">
              Your data may be processed in countries other than your country of residence. We ensure that all international transfers comply with applicable data protection laws and implement appropriate safeguards.
            </Typography>
            <Typography variant="body1">
              We use standard contractual clauses and other legal mechanisms to ensure your data receives adequate protection regardless of where it is processed.
            </Typography>
          </Card>

          {/* Children's Privacy */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Children's Privacy</Typography>
            <Typography variant="body1" className="mb-4">
              WorldHuman Studio is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children under 18.
            </Typography>
            <Typography variant="body1">
              If we become aware that we have collected personal information from a child under 18, we will take steps to delete such information promptly.
            </Typography>
          </Card>

          {/* Policy Updates */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Privacy Policy Updates</Typography>
            <Typography variant="body1" className="mb-4">
              We may update this Privacy Policy periodically to reflect changes in our practices or applicable laws. We will notify users of material changes through the app or via email.
            </Typography>
            <Typography variant="body1">
              The "Last Updated" date at the top of this policy indicates when the most recent changes were made.
            </Typography>
          </Card>

          {/* Contact Information */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <Typography variant="h3" className="mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Contact Us
            </Typography>
            <Typography variant="body1" className="mb-4">
              If you have questions about this Privacy Policy or wish to exercise your privacy rights, please contact us:
            </Typography>
            <div className="space-y-2">
              <Typography variant="body1">
                <strong>Email:</strong> support@worldhuman.studio
              </Typography>
              <Typography variant="body1">
                <strong>Privacy Officer:</strong> privacy@worldhuman.studio
              </Typography>
              <Typography variant="body1">
                <strong>Response Time:</strong> We will respond to privacy requests within 30 days
              </Typography>
            </div>
          </Card>

          {/* Download Option */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4 flex items-center gap-2">
              <Download className="w-5 h-5" />
              Download This Policy
            </Typography>
            <Typography variant="body1" className="mb-4">
              You can save or print this Privacy Policy for your records.
            </Typography>
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Print Privacy Policy
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}