import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WelcomeEmailRequest {
  email: string;
  displayName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, displayName }: WelcomeEmailRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    const name = displayName || email.split("@")[0];

    const emailResponse = await resend.emails.send({
      from: "Buildable <noreply@buildablelabs.dev>",
      to: [email],
      subject: "Welcome to Buildable! 🚀 Let's build something amazing",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Buildable</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <div style="display: inline-flex; align-items: center; gap: 12px;">
                <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 24px; font-weight: bold; color: white;">B</span>
                </div>
                <span style="font-size: 28px; font-weight: 700; color: #ffffff;">Buildable</span>
              </div>
            </td>
          </tr>
          
          <!-- Main Content Card -->
          <tr>
            <td style="background: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%); border-radius: 16px; border: 1px solid rgba(139, 92, 246, 0.2); padding: 40px;">
              
              <!-- Welcome Message -->
              <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #ffffff; text-align: center;">
                Welcome aboard, ${name}! 🎉
              </h1>
              
              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #a1a1aa; text-align: center;">
                You've just joined a community of creators building the future with AI-powered development. Let's get you started!
              </p>
              
              <!-- Getting Started Section -->
              <div style="background: rgba(139, 92, 246, 0.1); border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #a855f7;">
                  🚀 Quick Start Guide
                </h2>
                
                <div style="margin-bottom: 16px;">
                  <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
                    <span style="background: #a855f7; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin-right: 12px; flex-shrink: 0;">1</span>
                    <div>
                      <strong style="color: #ffffff;">Create Your First Project</strong>
                      <p style="margin: 4px 0 0 0; font-size: 14px; color: #a1a1aa;">Head to your dashboard and click "New Project" to start building.</p>
                    </div>
                  </div>
                  
                  <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
                    <span style="background: #a855f7; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin-right: 12px; flex-shrink: 0;">2</span>
                    <div>
                      <strong style="color: #ffffff;">Describe What You Want</strong>
                      <p style="margin: 4px 0 0 0; font-size: 14px; color: #a1a1aa;">Tell Buildable AI what you want to create in plain English.</p>
                    </div>
                  </div>
                  
                  <div style="display: flex; align-items: flex-start;">
                    <span style="background: #a855f7; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin-right: 12px; flex-shrink: 0;">3</span>
                    <div>
                      <strong style="color: #ffffff;">Watch It Come to Life</strong>
                      <p style="margin: 4px 0 0 0; font-size: 14px; color: #a1a1aa;">See your app built in real-time with live preview.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="https://buildablelabs.dev/dashboard" style="display: inline-block; background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px;">
                      Go to Dashboard →
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Resources Section -->
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #ffffff; text-align: center;">
                  Helpful Resources
                </h3>
                
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td align="center" style="padding: 8px;">
                      <a href="https://buildablelabs.dev/docs" style="color: #a855f7; text-decoration: none; font-size: 14px;">📚 Documentation</a>
                    </td>
                    <td align="center" style="padding: 8px;">
                      <a href="https://buildablelabs.dev/dashboard/templates" style="color: #a855f7; text-decoration: none; font-size: 14px;">🎨 Templates</a>
                    </td>
                    <td align="center" style="padding: 8px;">
                      <a href="https://buildablelabs.dev/pricing" style="color: #a855f7; text-decoration: none; font-size: 14px;">💎 Pricing</a>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #71717a;">
                Questions? Reply to this email or reach out anytime.
              </p>
              <p style="margin: 0; font-size: 12px; color: #52525b;">
                © ${new Date().getFullYear()} Buildable Labs. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-welcome-email function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
