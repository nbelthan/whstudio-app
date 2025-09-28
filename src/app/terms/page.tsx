'use client';

import { Card, Typography, Button } from '@worldcoin/mini-apps-ui-kit-react';
import { ArrowLeft, FileText, AlertTriangle, CheckCircle, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TermsOfServicePage() {
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
            <FileText className="w-6 h-6" />
            Terms of Service
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

        {/* Terms of Service Content */}
        <div className="space-y-8">
          {/* Introduction */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Agreement to Terms</Typography>
            <Typography variant="body1" className="mb-4">
              Welcome to WorldHuman Studio ("we," "our," or "us"). These Terms of Service ("Terms") govern your use of our AI-powered data annotation platform accessible through the World App ecosystem.
            </Typography>
            <Typography variant="body1" className="mb-4">
              By accessing or using WorldHuman Studio, you agree to be bound by these Terms. If you disagree with any part of these terms, you may not access our service.
            </Typography>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <Typography variant="body1" className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span className="text-yellow-800">
                  <strong>Important:</strong> These Terms constitute a legally binding agreement. Please read them carefully.
                </span>
              </Typography>
            </div>
          </Card>

          {/* Eligibility */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Eligibility</Typography>
            <div className="space-y-3">
              <Typography variant="body1">
                To use WorldHuman Studio, you must:
              </Typography>
              <div className="space-y-2">
                <Typography variant="body1" className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Be at least 18 years of age
                </Typography>
                <Typography variant="body1" className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Have a valid World ID verification
                </Typography>
                <Typography variant="body1" className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Comply with all applicable laws and regulations
                </Typography>
                <Typography variant="body1" className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Not be prohibited from using our services under applicable law
                </Typography>
              </div>
            </div>
          </Card>

          {/* Service Description */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Service Description</Typography>
            <Typography variant="body1" className="mb-4">
              WorldHuman Studio is a platform that connects users with AI training tasks, including:
            </Typography>
            <div className="space-y-2">
              <Typography variant="body1">• RLHF (Reinforcement Learning from Human Feedback) annotations</Typography>
              <Typography variant="body1">• Data labeling and categorization tasks</Typography>
              <Typography variant="body1">• Content evaluation and rating</Typography>
              <Typography variant="body1">• Voice recording and transcription tasks</Typography>
              <Typography variant="body1">• Other human intelligence tasks as we may offer</Typography>
            </div>
            <Typography variant="body1" className="mt-4">
              In exchange for quality task completion, users earn cryptocurrency rewards distributed via blockchain transactions.
            </Typography>
          </Card>

          {/* User Obligations */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">User Obligations</Typography>

            <div className="space-y-4">
              <div>
                <Typography variant="h4" className="mb-2">Task Completion Standards</Typography>
                <Typography variant="body1" className="mb-2">You agree to:</Typography>
                <div className="space-y-1 ml-4">
                  <Typography variant="body1">• Provide honest, thoughtful, and accurate responses</Typography>
                  <Typography variant="body1">• Follow all task instructions carefully</Typography>
                  <Typography variant="body1">• Complete tasks in good faith without gaming the system</Typography>
                  <Typography variant="body1">• Not use automated tools or scripts to complete tasks</Typography>
                </div>
              </div>

              <div>
                <Typography variant="h4" className="mb-2">Account Security</Typography>
                <div className="space-y-1 ml-4">
                  <Typography variant="body1">• Maintain the security of your World ID and wallet</Typography>
                  <Typography variant="body1">• Not share your account access with others</Typography>
                  <Typography variant="body1">• Report suspicious activity immediately</Typography>
                  <Typography variant="body1">• Use only one account per person</Typography>
                </div>
              </div>

              <div>
                <Typography variant="h4" className="mb-2">Prohibited Activities</Typography>
                <div className="space-y-1 ml-4">
                  <Typography variant="body1">• Creating multiple accounts (sybil attacks)</Typography>
                  <Typography variant="body1">• Submitting spam, inappropriate, or harmful content</Typography>
                  <Typography variant="body1">• Attempting to manipulate or game the consensus system</Typography>
                  <Typography variant="body1">• Interfering with other users' ability to use the platform</Typography>
                  <Typography variant="body1">• Violating any applicable laws or regulations</Typography>
                </div>
              </div>
            </div>
          </Card>

          {/* Payment Terms */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Payment and Rewards</Typography>

            <div className="space-y-4">
              <div>
                <Typography variant="h4" className="mb-2">Earning Structure</Typography>
                <Typography variant="body1" className="mb-2">
                  Rewards are calculated based on:
                </Typography>
                <div className="space-y-1 ml-4">
                  <Typography variant="body1">• Task complexity and time requirements</Typography>
                  <Typography variant="body1">• Quality of submissions as determined by consensus</Typography>
                  <Typography variant="body1">• Agreement with other human annotators</Typography>
                  <Typography variant="body1">• Overall contribution to data quality</Typography>
                </div>
              </div>

              <div>
                <Typography variant="h4" className="mb-2">Payment Processing</Typography>
                <div className="space-y-1 ml-4">
                  <Typography variant="body1">• Payments are made in cryptocurrency (USDC/WLD)</Typography>
                  <Typography variant="body1">• Transactions are processed via blockchain networks</Typography>
                  <Typography variant="body1">• You are responsible for any applicable taxes</Typography>
                  <Typography variant="body1">• Minimum payout thresholds may apply</Typography>
                </div>
              </div>

              <div>
                <Typography variant="h4" className="mb-2">Quality Assurance</Typography>
                <Typography variant="body1">
                  We reserve the right to withhold payment for submissions that don't meet quality standards,
                  violate guidelines, or appear to be automated/spam. Our consensus-based system ensures fair evaluation.
                </Typography>
              </div>
            </div>
          </Card>

          {/* Intellectual Property */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Intellectual Property</Typography>

            <div className="space-y-4">
              <div>
                <Typography variant="h4" className="mb-2">User Submissions</Typography>
                <Typography variant="body1">
                  By submitting content through our platform, you grant us a worldwide, royalty-free license to use,
                  modify, and distribute your submissions for AI training and research purposes. You retain ownership
                  of your original content.
                </Typography>
              </div>

              <div>
                <Typography variant="h4" className="mb-2">Platform Content</Typography>
                <Typography variant="body1">
                  All platform content, including software, designs, and documentation, is owned by WorldHuman Studio
                  and protected by intellectual property laws. You may not copy, modify, or distribute our proprietary content.
                </Typography>
              </div>
            </div>
          </Card>

          {/* Privacy and Data */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Privacy and Data Protection</Typography>
            <Typography variant="body1" className="mb-4">
              Your privacy is important to us. Please review our{' '}
              <button
                onClick={() => router.push('/privacy')}
                className="text-blue-600 underline hover:text-blue-800"
              >
                Privacy Policy
              </button>
              {' '}to understand how we collect, use, and protect your personal information.
            </Typography>
            <Typography variant="body1">
              By using our service, you consent to the data practices described in our Privacy Policy and
              acknowledge that your submissions may be used for AI training purposes.
            </Typography>
          </Card>

          {/* Platform Availability */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Platform Availability</Typography>
            <Typography variant="body1" className="mb-4">
              While we strive to maintain continuous service availability, we do not guarantee uninterrupted access.
              The platform may be temporarily unavailable due to:
            </Typography>
            <div className="space-y-1 ml-4">
              <Typography variant="body1">• Scheduled maintenance and updates</Typography>
              <Typography variant="body1">• Technical difficulties or server issues</Typography>
              <Typography variant="body1">• Network or internet connectivity problems</Typography>
              <Typography variant="body1">• Force majeure events beyond our control</Typography>
            </div>
          </Card>

          {/* Disclaimers */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Disclaimers</Typography>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <Typography variant="body1" className="text-red-800">
                <strong>Important Legal Notice:</strong> Our service is provided "as is" without warranties of any kind.
              </Typography>
            </div>
            <div className="space-y-3">
              <Typography variant="body1">
                <strong>No Investment Advice:</strong> Cryptocurrency rewards involve market risks. We provide no investment advice.
              </Typography>
              <Typography variant="body1">
                <strong>No Guarantee of Earnings:</strong> Payment amounts depend on task availability, quality, and market conditions.
              </Typography>
              <Typography variant="body1">
                <strong>Third-Party Dependencies:</strong> Our service relies on World App, blockchain networks, and other third parties.
              </Typography>
            </div>
          </Card>

          {/* Limitation of Liability */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Limitation of Liability</Typography>
            <Typography variant="body1" className="mb-4">
              To the maximum extent permitted by law, WorldHuman Studio shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, including but not limited to:
            </Typography>
            <div className="space-y-1 ml-4">
              <Typography variant="body1">• Loss of profits or revenue</Typography>
              <Typography variant="body1">• Loss of data or business opportunities</Typography>
              <Typography variant="body1">• Cryptocurrency price volatility</Typography>
              <Typography variant="body1">• Network congestion or transaction failures</Typography>
            </div>
            <Typography variant="body1" className="mt-4">
              Our total liability shall not exceed the amount you paid or earned through our platform in the
              three months prior to the claim.
            </Typography>
          </Card>

          {/* Termination */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Termination</Typography>

            <div className="space-y-4">
              <div>
                <Typography variant="h4" className="mb-2">User Termination</Typography>
                <Typography variant="body1">
                  You may stop using our service at any time. Upon termination, you remain entitled to any
                  earned but unpaid rewards, subject to our payment processing timeline.
                </Typography>
              </div>

              <div>
                <Typography variant="h4" className="mb-2">Platform Termination</Typography>
                <Typography variant="body1">
                  We may suspend or terminate your account if you violate these Terms, engage in prohibited
                  activities, or for other legitimate business reasons. We will provide reasonable notice when possible.
                </Typography>
              </div>

              <div>
                <Typography variant="h4" className="mb-2">Effect of Termination</Typography>
                <Typography variant="body1">
                  Upon termination, your right to use the platform ceases, but provisions regarding payments,
                  intellectual property, and liability shall survive.
                </Typography>
              </div>
            </div>
          </Card>

          {/* Governing Law */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Governing Law and Disputes</Typography>
            <Typography variant="body1" className="mb-4">
              These Terms are governed by the laws of [Jurisdiction], without regard to conflict of law principles.
              Any disputes shall be resolved through binding arbitration in accordance with [Arbitration Rules].
            </Typography>
            <Typography variant="body1">
              You agree to resolve disputes individually and waive any right to participate in class action lawsuits.
            </Typography>
          </Card>

          {/* Changes to Terms */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Changes to Terms</Typography>
            <Typography variant="body1" className="mb-4">
              We may update these Terms periodically to reflect changes in our services or applicable laws.
              Material changes will be communicated through the app or via email.
            </Typography>
            <Typography variant="body1">
              Continued use of our service after changes constitutes acceptance of the updated Terms.
              If you disagree with changes, you should discontinue use of our service.
            </Typography>
          </Card>

          {/* Severability */}
          <Card className="p-6">
            <Typography variant="h3" className="mb-4">Severability</Typography>
            <Typography variant="body1">
              If any provision of these Terms is found to be unenforceable or invalid, the remaining provisions
              shall continue in full force and effect. Invalid provisions shall be modified to the minimum extent
              necessary to make them enforceable.
            </Typography>
          </Card>

          {/* Contact Information */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <Typography variant="h3" className="mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Contact Information
            </Typography>
            <Typography variant="body1" className="mb-4">
              If you have questions about these Terms of Service, please contact us:
            </Typography>
            <div className="space-y-2">
              <Typography variant="body1">
                <strong>Email:</strong> support@worldhuman.studio
              </Typography>
              <Typography variant="body1">
                <strong>Legal Inquiries:</strong> legal@worldhuman.studio
              </Typography>
              <Typography variant="body1">
                <strong>Response Time:</strong> We will respond to inquiries within 5 business days
              </Typography>
            </div>
          </Card>

          {/* Acknowledgment */}
          <Card className="p-6 bg-green-50 border-green-200">
            <Typography variant="h3" className="mb-4">Acknowledgment</Typography>
            <Typography variant="body1">
              By using WorldHuman Studio, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              You also acknowledge that you have read our Privacy Policy and consent to our data practices.
            </Typography>
          </Card>
        </div>
      </div>
    </div>
  );
}