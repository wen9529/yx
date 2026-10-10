package bigtwo

import (
	"errors"
	"sort"
)

// BigTwo Suit: Spade(4) > Heart(3) > Club(2) > Diamond(1)
type Suit int

const (
	Diamond Suit = 1
	Club    Suit = 2
	Heart   Suit = 3
	Spade   Suit = 4
)

// Card in BigTwo: Rank 3..13 (3..K), 14:A, 15:2 (2 is highest)
type Card struct {
	ID      string `json:"id"`
	Suit    Suit   `json:"suit"`
	Rank    int    `json:"rank"` // 3..15
	Display string `json:"display"`
}

type ComboType int

const (
	ComboInvalid ComboType = iota
	ComboSingle
	ComboPair
	ComboTriple
	ComboStraight      // 顺子 (Rank 1 of 5-card hands)
	ComboFlush         // 同花 (Rank 2)
	ComboFullHouse     // 葫芦 (Rank 3)
	ComboFourOfAKind   // 铁支 (Rank 4)
	ComboStraightFlush // 同花顺 (Rank 5)
)

type ParsedCombo struct {
	Type        ComboType
	PrimaryRank int
	HighestSuit Suit
}

// CompareCard: In Big Two, Rank first, then Suit
func CompareCard(a, b Card) int {
	if a.Rank != b.Rank {
		if a.Rank > b.Rank {
			return 1
		}
		return -1
	}
	if a.Suit > b.Suit {
		return 1
	} else if a.Suit < b.Suit {
		return -1
	}
	return 0
}

// IsDiamondThree checks if card is 方块3
func IsDiamondThree(c Card) bool {
	return c.Rank == 3 && c.Suit == Diamond
}

// EvaluateCombo evaluates a play in Big Two
func EvaluateCombo(cards []Card) (ParsedCombo, error) {
	n := len(cards)
	if n == 0 {
		return ParsedCombo{Type: ComboInvalid}, errors.New("empty hand")
	}

	// Sort cards descending
	sorted := make([]Card, n)
	copy(sorted, cards)
	sort.Slice(sorted, func(i, j int) bool {
		return CompareCard(sorted[i], sorted[j]) > 0
	})

	if n == 1 {
		return ParsedCombo{
			Type:        ComboSingle,
			PrimaryRank: sorted[0].Rank,
			HighestSuit: sorted[0].Suit,
		}, nil
	}

	if n == 2 {
		if sorted[0].Rank == sorted[1].Rank {
			return ParsedCombo{
				Type:        ComboPair,
				PrimaryRank: sorted[0].Rank,
				HighestSuit: sorted[0].Suit, // highest suit of the pair
			}, nil
		}
		return ParsedCombo{Type: ComboInvalid}, errors.New("invalid pair")
	}

	if n == 3 {
		if sorted[0].Rank == sorted[1].Rank && sorted[1].Rank == sorted[2].Rank {
			return ParsedCombo{
				Type:        ComboTriple,
				PrimaryRank: sorted[0].Rank,
				HighestSuit: sorted[0].Suit,
			}, nil
		}
		return ParsedCombo{Type: ComboInvalid}, errors.New("invalid triple")
	}

	if n == 5 {
		return evaluateFiveCardHand(sorted)
	}

	return ParsedCombo{Type: ComboInvalid}, errors.New("invalid card count for BigTwo")
}

func evaluateFiveCardHand(cards []Card) (ParsedCombo, error) {
	// cards are sorted descending by CompareCard
	isFlush := true
	for i := 1; i < 5; i++ {
		if cards[i].Suit != cards[0].Suit {
			isFlush = false
			break
		}
	}

	isStraight := true
	for i := 0; i < 4; i++ {
		if cards[i].Rank-cards[i+1].Rank != 1 {
			isStraight = false
			break
		}
	}
	// Special A-2-3-4-5 straight check in Big Two: 15,14,5,4,3 or 15,5,4,3,2
	if !isStraight && cards[0].Rank == 15 && cards[1].Rank == 14 && cards[2].Rank == 5 && cards[3].Rank == 4 && cards[4].Rank == 3 {
		isStraight = true
	}

	if isStraight && isFlush {
		return ParsedCombo{
			Type:        ComboStraightFlush,
			PrimaryRank: cards[0].Rank,
			HighestSuit: cards[0].Suit,
		}, nil
	}

	// Count rank frequencies
	freq := make(map[int]int)
	for _, c := range cards {
		freq[c.Rank]++
	}

	var quadRank, tripRank int
	for r, count := range freq {
		if count == 4 {
			quadRank = r
		} else if count == 3 {
			tripRank = r
		}
	}

	// Four of a Kind (铁支)
	if quadRank > 0 {
		return ParsedCombo{
			Type:        ComboFourOfAKind,
			PrimaryRank: quadRank,
			HighestSuit: cards[0].Suit,
		}, nil
	}

	// Full House (葫芦)
	if tripRank > 0 && len(freq) == 2 {
		return ParsedCombo{
			Type:        ComboFullHouse,
			PrimaryRank: tripRank,
			HighestSuit: cards[0].Suit,
		}, nil
	}

	// Flush (同花)
	if isFlush {
		return ParsedCombo{
			Type:        ComboFlush,
			PrimaryRank: cards[0].Rank,
			HighestSuit: cards[0].Suit,
		}, nil
	}

	// Straight (顺子)
	if isStraight {
		return ParsedCombo{
			Type:        ComboStraight,
			PrimaryRank: cards[0].Rank,
			HighestSuit: cards[0].Suit,
		}, nil
	}

	return ParsedCombo{Type: ComboInvalid}, errors.New("not a valid 5-card combo")
}

// CanBeatBigTwo tests if newCombo beats prevCombo in BigTwo
func CanBeatBigTwo(newCombo, prevCombo ParsedCombo) bool {
	// 5-card hands comparison
	if isFiveCard(newCombo.Type) && isFiveCard(prevCombo.Type) {
		if newCombo.Type != prevCombo.Type {
			return newCombo.Type > prevCombo.Type
		}
		// Same 5-card type
		if newCombo.PrimaryRank != prevCombo.PrimaryRank {
			return newCombo.PrimaryRank > prevCombo.PrimaryRank
		}
		return newCombo.HighestSuit > prevCombo.HighestSuit
	}

	if newCombo.Type != prevCombo.Type {
		return false
	}

	if newCombo.PrimaryRank != prevCombo.PrimaryRank {
		return newCombo.PrimaryRank > prevCombo.PrimaryRank
	}

	return newCombo.HighestSuit > prevCombo.HighestSuit
}

func isFiveCard(t ComboType) bool {
	return t >= ComboStraight && t <= ComboStraightFlush
}

// CalculatePenaltyMultiplier returns Big Two penalty factor for remaining cards
func CalculatePenaltyMultiplier(remainingCards int) int {
	if remainingCards >= 13 {
		return 4 // 未出牌 / 一条龙
	}
	if remainingCards >= 10 {
		return 3 // 三炒
	}
	if remainingCards >= 8 {
		return 2 // 双炒
	}
	return 1
}
