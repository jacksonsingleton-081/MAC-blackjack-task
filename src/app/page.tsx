"use client";

import { useState } from "react";

type Card = { value: number; display: string;};

export default function Home() {
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [totalChips, setTotalChips] = useState<number>(100);
  const [chips, setChips] = useState<number>(0);
  const [inRound, setInRound] = useState<boolean>(false);
  const [showTopUp, setShowTopUp] = useState<boolean>(false);
  const [playerStatus, setPlayerStatus] = useState<"Player" | "Win" | "Lose" | "Push">("Player");
  const [dealerRevealed, setDealerRevealed] = useState<boolean[]>([]);
  const [aiRecommendation, setAiRecommendation] = useState<"Hit" | "Stand" | null>(null);

  const HAND_WIDTH = 220;

  const drawCard = (): Card => {
    const suits = ["♠️", "♥️", "♦️", "♣️"];
    const cards = [
    { value: 2, display: "2" },
    { value: 3, display: "3" },
    { value: 4, display: "4" },
    { value: 5, display: "5" },
    { value: 6, display: "6" },
    { value: 7, display: "7" },
    { value: 8, display: "8" },
    { value: 9, display: "9" },
    { value: 10, display: "10" },
    { value: 10, display: "J" },
    { value: 10, display: "Q" },
    { value: 10, display: "K" },
    { value: 11, display: "A" },
  ]; 

    const card = cards[Math.floor(Math.random() * cards.length)];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    return { value: card.value, display: `${card.display}${suit}` };
  };

  // calculate the total of a hand including ace => 1/11 logic
  const calculateTotal = (hand: Card[]) => {
    let total = hand.reduce((sum, card) => sum + card.value, 0);
    let aces = hand.filter(c => c.value ===  11).length;

    while (total > 21 && aces > 0) {
      total -= 10; 
      aces -= 1;
    }
    return total;
  };

  // calculating the dealers hand when only some cards are revealed
  const calculateRevealedTotal = (hand: Card[], revealed: boolean[]) => {
    const revealedCards = hand.filter((_, idx) => revealed[idx]);
    return calculateTotal(revealedCards); // feed into calculateTotal avoiding code douplication
  }

  // starting round by placing a bet
  const placeBet = () => {
    if (chips <= 0 || chips > totalChips) return; // check for valid bet

    const newPlayer = [drawCard(), drawCard()];
    const newDealer = [drawCard(), drawCard()];

    setTotalChips(totalChips - chips);
    setPlayerHand(newPlayer);
    setDealerHand(newDealer);
    setDealerRevealed([true, false]); // don't reveal dealer's second card
    setInRound(true);
    setPlayerStatus("Player");
    setAiRecommendation(null);
  };

  // player decides to hit, draw a card
  const hit = () => {
    if (!inRound) return; // check round has begun 

    const newHand = [...playerHand, drawCard()];
    setPlayerHand(newHand);
    setAiRecommendation(null);
  
    // player busts if their hand is over 21
    if (calculateTotal(newHand) > 21) {
      setPlayerStatus("Lose");
      setChips(0);
      setInRound(false);
    }
  };

  // player decides to stand, reveal dealers hand
  const stand = async () => {
    if (!inRound) return;

    setDealerRevealed(prev => prev.map((rev, i) => i === 1 ? true : rev)); // reveal second card
  
    const dealer = [...dealerHand];
    while (calculateTotal(dealer) < 17) { // draws until >=17
      await delay(500);
      dealer.push(drawCard());
      setDealerRevealed(prev => [...prev, true]);
      setDealerHand(dealer);
    }

    const playerTotal = calculateTotal(playerHand);
    const dealerTotal = calculateTotal(dealer);
    
    if (dealerTotal > 21 || playerTotal > dealerTotal) { // player wins if > dealer or dealer busts
      setPlayerStatus("Win");
      setTotalChips(totalChips + chips * 2);
    } else if (playerTotal < dealerTotal) { // dealer wins if > player
      setPlayerStatus("Lose");
    } else { // if scores tie its a push, chips are refunded
      setPlayerStatus("Push");
      setTotalChips(totalChips + chips);
    }

    setChips(0);
    setInRound(false);
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // topping up total chip balance at top left
  const addBet5 = () => setChips(chips + 5);
  const addBet10 = () => setChips(chips + 10);
  const subBet5 = () => {setChips((prev) => Math.max(prev - 5, 0));};
  const topUp = (topUp : number) => {
    setTotalChips(totalChips + topUp);
    setShowTopUp(false);
  };

  // illustrating the front of the card when drawn
  const renderCard = (card?: Card, revealed: boolean = true) => {
    if (!card || !revealed) return <div style={cardBackStyle}></div>;

    const isRed = card && (card.display.includes("♥️") || card.display.includes("♦️")); // style by default is black
    // change to red if heart or diamond is drawn
    const [rank, suit] = card ? [card.display.slice(0, -2), card.display.slice(-2)] : ["", ""];

    return (
      <div 
        style={{ 
          ...cardFrontStyle, 
          color: isRed ? "red" : "black",
        }}
      >
        <div style={{ alignSelf: "flex-start" }}>{rank}{suit}</div>
        <div style={{ alignSelf: "flex-end", transform: "rotate(180deg)" }}>{rank}{suit}</div>
      </div>
    );
  };

  // API
  // couldn't get this to work
  const getAiRecommendation = async () => {
    try {
      const playerTotal = calculateTotal(playerHand);
      const dealerCardValue = dealerHand[0]?.value || 0;

      const res = await fetch(
        `/api/ai-help?playerTotal=${playerTotal}&dealerCard=${dealerCardValue}`
      );

      const data = await res.json();
      setAiRecommendation(data.recommendation as "Hit" | "Stand");
    } catch (err) {
      console.error("Failed to fetch AI recommendation", err);
    }
  };

  const cardBackStyle: React.CSSProperties = {
    width: "50px",
    height: "70px",
    borderRadius: "6px",
    backgroundColor: "#b00",
    border: "2px solid #ccc",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  const cardFrontStyle: React.CSSProperties = {
    width: "50px",
    height: "70px",
    borderRadius: "6px",
    backgroundColor: "white",
    border: "2px solid #ccc",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.3rem",
    color: "black",
    fontWeight: "bold",
    fontSize: "1.1rem",
  };

  const buttonStyle = {
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    border: "2px solid white",
    borderColor: "white",
    fontWeight: "bold",
    cursor: "pointer",
  };

  return (
    <main style={{ padding: "2rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>BLACKJACK</h1>

      {/* Chip Balance */}
      <div 
        style={{ 
          position: "relative", 
          textAlign: "left", 
          fontWeight: "bold",  
          cursor: "pointer" 
        }}
        onClick={() => setShowTopUp(!showTopUp)}
      >
        Chip Balance: {totalChips} +
        {showTopUp && (
          <div 
            style={{ 
              position: "absolute", 
              top: "2rem",
              left: 0,
              backgroundColor: "white",
              color: "black",
              padding: "0.5rem",
              border: "1px solid black",
              borderRadius: "4px",
              zIndex: 10
            }}
          >
            <button onClick={() => topUp(5)} style={ buttonStyle }>+5</button>
            <button onClick={() => topUp(10)} style={ buttonStyle }>+10</button>
            <button onClick={() => topUp(50)} style={ buttonStyle }>+50</button>
          </div>
        )}
      </div>
    
      {/* Card Dealing */}
      <div style={{ minHeight: "180px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem", alignItems: "center" }}>
        {/* Dealer */}
        <div>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", width: HAND_WIDTH }}>
            {(dealerHand.length > 0 ? dealerHand : [undefined, undefined]).map((card, idx) => (
              <div key={idx}>
                {renderCard(card, card ? dealerRevealed[idx] : false)}
              </div>
            ))}
          </div>
          <div style={{
            display: "inline-block",
            padding: "0.5rem 1rem",
            borderRadius: "4px",
            backgroundColor: "white",
            fontWeight: "bold",
            width: "110px",
            color: "black",
            marginTop: "1rem",
          }}>
            Dealer: {calculateRevealedTotal(dealerHand, dealerRevealed)}
          </div>
        </div>

        {/* Player */}
        <div>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", width: HAND_WIDTH }}>
            {(playerHand.length === 0 ? [0, 1] : playerHand.map((_, i) => i)).map((i, idx) => {
              const card = playerHand[idx];
              return <div key={idx}>{renderCard(card, true)}</div>;
            })}
          </div>
          <div style={{
            display: "inline-block",
            padding: "0.5rem 1rem",
            borderRadius: "4px",
            fontWeight: "bold",
            width: "110px",
            backgroundColor:
              playerStatus === "Win" ? "green" :
              playerStatus === "Lose" ? "red" :
              playerStatus === "Push" ? "orange" :
              "white",
            color: playerStatus === "Player" ? "black" : "white",
            marginTop: "1rem",
          }}>
            {playerStatus}: {calculateTotal(playerHand)}
          </div>
        </div>
      </div>
    </div>

    {/* Game Controls */}
    {/* Betting & Action Section */}
    <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", }}>
      {!inRound ? (
        <>
          {/* Current Bet Box */}
          <div style={{ ...buttonStyle, width: "200px", marginBottom: "1rem", textAlign: "center", cursor: "default" }}>
            Current Bet: {chips}
          </div>

          {/* Bet Adjust Buttons */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", }}>
            <button onClick={addBet5} style={{ ...buttonStyle, width: "59px", textAlign: "center", }}>  
              +5
            </button>
            <button onClick={addBet10} style={{ ...buttonStyle, width: "59px", textAlign: "center", }}>
              +10
            </button>
            <button onClick={subBet5} style={{ ...buttonStyle, width: "59px", textAlign: "center", }}>
              -5
            </button>
          
          </div>

        {/* Place Bet Button Box */}
        <button onClick={placeBet} style={{...buttonStyle, backgroundColor: "white", color: "black", width: "200px", }}>
          Place Bet
        </button>
      </>
    ) : (
      <>
        {/* In-Round Actions */}
        <div style={{ display: "flex", gap: "2rem" }}>
          <button onClick={hit} style={{ 
            ...buttonStyle, 
            borderColor: aiRecommendation === "Hit" ? "orange" : "white", 
            borderWidth: "4px", 
            background: "white", 
            color: "black", 
            width: "100px", }}>
            Hit
          </button>

          <button onClick={getAiRecommendation} style={{ 
            ...buttonStyle, 
            borderRadius: "50%", 
            width: "25px", 
            height: "25px", 
            padding: "0", 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            marginTop: "10px" }}
          >
            ?
          </button>

          <button onClick={stand} style={{ 
            ...buttonStyle, 
            borderColor: aiRecommendation === "Stand" ? "orange" : "white", 
            borderWidth: "4px",
            background: "white", 
            color: "black", 
            width: "100px", }}>
            Stand
          </button>
        </div>
      </>

      )}
    </div>
  </main>
  );
}
