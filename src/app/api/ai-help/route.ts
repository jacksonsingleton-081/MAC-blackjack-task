import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;

    const playerTotal = searchParams.get("playerTotal")
    const dealerCard = searchParams.get("dealerCard")

    const prompt = `
    You are a professional blackjack player trying to help an inexperienced player win the hand.
    The player is currently holding ${playerTotal}. The dealer's revealed card a ${dealerCard}.
    Respond with a single word whether the player should "Hit" or "Stand", no other text`;

    try {
        const response = await fetch("https://api.gemini.com/v1/responses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gemini-2.5-flash",
                prompt: prompt,
                max_tokens: 5,
            }),
        });

        const data = await response.json();
        const recommendation = data.output_text?.trim() || null;
        console.log("Recommendation returned: ", recommendation)

        return NextResponse.json({ recommendation });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ recommendation: "Stand" });
    }
}