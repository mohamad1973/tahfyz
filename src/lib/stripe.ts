import Stripe from "stripe";

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function stripeCheckoutUrl(opts: {
  bookingId: string;
  amountUsd: number;
  teacherName: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: opts.customerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(opts.amountUsd * 100),
          product_data: {
            name: `Tahfyz lesson with ${opts.teacherName}`,
            description: `1-hour online Quran lesson · booking ${opts.bookingId}`,
          },
        },
      },
    ],
    metadata: { bookingId: opts.bookingId },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  });

  return session.url;
}
