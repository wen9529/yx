package thirteen

import (
	"errors"
	"sort"
)

type Suit string

const (
	Spade   Suit = "spade"
	Heart   Suit = "heart"
	Club    Suit = "club"
	Diamond Suit = "diamond"
)

type Card struct {
	ID      string `json:"id"`
	Suit    Suit   `json:"suit"`
	Rank    int    `json:"rank"` // 2..14 (A=14)
	Display string `json:"display"`
}

type HandTierRank int

const (
	TierHighCard      HandTierRank = 1
	TierOnePair       HandTierRank = 2
	TierTwoPair       HandTierRank = 3
	TierThreeOfAKind  HandTierRank = 4
	TierStraight      HandTierRank = 5
	TierFlush         HandTierRank = 6
	TierFullHouse     HandTierRank = 7
	TierFourOfAKind   HandTierRank = 8
	TierStraightFlush HandTierRank = 9
)

type HandEvaluation struct {
	Tier        HandTierRank
	PrimaryRank int
	SecondaryRank int
	Kickers     []int
}

// EvaluateFiveCards evaluates a 5-card hand (Middle or Tail)
func EvaluateFiveCards(cards []Card) HandEvaluation {
	ranks := make([]int, 5)
	for i, c := range cards {
		ranks[i] = c.Rank
	}
	sort.Sort(sort.Reverse(sort.IntSlice(ranks)))

	isFlush := true
	for i := 1; i < 5; i++ {
		if cards[i].Suit != cards[0].Suit {
			isFlush = false
			break
		}
	}

	isStraight := true
	for i := 0; i < 4; i++ {
		if ranks[i]-ranks[i+1] != 1 {
			isStraight = false
			break
		}
	}
	// Ace-low straight: A-2-3-4-5 (14, 5, 4, 3, 2)
	isWheel := (ranks[0] == 14 && ranks[1] == 5 && ranks[2] == 4 && ranks[3] == 3 && ranks[4] == 2)
	if isWheel {
		isStraight = true
	}

	if isStraight && isFlush {
		primary := ranks[0]
		if isWheel {
			primary = 5
		}
		return HandEvaluation{Tier: TierStraightFlush, PrimaryRank: primary}
	}

	freq := make(map[int]int)
	for _, r := range ranks {
		freq[r]++
	}

	var quad, trip int
	var pairs []int
	var singles []int

	for r, count := range freq {
		switch count {
		case 4:
			quad = r
		case 3:
			trip = r
		case 2:
			pairs = append(pairs, r)
		case 1:
			singles = append(singles, r)
		}
	}
	sort.Sort(sort.Reverse(sort.IntSlice(pairs)))
	sort.Sort(sort.Reverse(sort.IntSlice(singles)))

	if quad > 0 {
		return HandEvaluation{Tier: TierFourOfAKind, PrimaryRank: quad, Kickers: singles}
	}
	if trip > 0 && len(pairs) == 1 {
		return HandEvaluation{Tier: TierFullHouse, PrimaryRank: trip, SecondaryRank: pairs[0]}
	}
	if isFlush {
		return HandEvaluation{Tier: TierFlush, PrimaryRank: ranks[0], Kickers: ranks[1:]}
	}
	if isStraight {
		primary := ranks[0]
		if isWheel {
			primary = 5
		}
		return HandEvaluation{Tier: TierStraight, PrimaryRank: primary}
	}
	if trip > 0 {
		return HandEvaluation{Tier: TierThreeOfAKind, PrimaryRank: trip, Kickers: singles}
	}
	if len(pairs) >= 2 {
		return HandEvaluation{Tier: TierTwoPair, PrimaryRank: pairs[0], SecondaryRank: pairs[1], Kickers: singles}
	}
	if len(pairs) == 1 {
		return HandEvaluation{Tier: TierOnePair, PrimaryRank: pairs[0], Kickers: singles}
	}

	return HandEvaluation{Tier: TierHighCard, PrimaryRank: ranks[0], Kickers: ranks[1:]}
}

// EvaluateThreeCards evaluates Head tier (3 cards, can only be HighCard, OnePair, ThreeOfAKind)
func EvaluateThreeCards(cards []Card) HandEvaluation {
	ranks := make([]int, 3)
	for i, c := range cards {
		ranks[i] = c.Rank
	}
	sort.Sort(sort.Reverse(sort.IntSlice(ranks)))

	if ranks[0] == ranks[1] && ranks[1] == ranks[2] {
		return HandEvaluation{Tier: TierThreeOfAKind, PrimaryRank: ranks[0]}
	}
	if ranks[0] == ranks[1] {
		return HandEvaluation{Tier: TierOnePair, PrimaryRank: ranks[0], Kickers: []int{ranks[2]}}
	}
	if ranks[1] == ranks[2] {
		return HandEvaluation{Tier: TierOnePair, PrimaryRank: ranks[1], Kickers: []int{ranks[0]}}
	}

	return HandEvaluation{Tier: TierHighCard, PrimaryRank: ranks[0], Kickers: []int{ranks[1], ranks[2]}}
}

// CompareEvaluations: Returns >0 if a > b, <0 if a < b, 0 if equal
func CompareEvaluations(a, b HandEvaluation) int {
	if a.Tier != b.Tier {
		if a.Tier > b.Tier {
			return 1
		}
		return -1
	}
	if a.PrimaryRank != b.PrimaryRank {
		if a.PrimaryRank > b.PrimaryRank {
			return 1
		}
		return -1
	}
	if a.SecondaryRank != b.SecondaryRank {
		if a.SecondaryRank > b.SecondaryRank {
			return 1
		}
		return -1
	}
	// Check kickers
	for i := 0; i < len(a.Kickers) && i < len(b.Kickers); i++ {
		if a.Kickers[i] != b.Kickers[i] {
			if a.Kickers[i] > b.Kickers[i] {
				return 1
			}
			return -1
		}
	}
	return 0
}

// CheckFouledHand checks 倒水 (Tail must be >= Mid, and Mid must be >= Head)
func CheckFouledHand(head []Card, mid []Card, tail []Card) (bool, error) {
	if len(head) != 3 || len(mid) != 5 || len(tail) != 5 {
		return true, errors.New("invalid card counts: head(3), mid(5), tail(5) required")
	}

	headEval := EvaluateThreeCards(head)
	midEval := EvaluateFiveCards(mid)
	tailEval := EvaluateFiveCards(tail)

	// Tail vs Mid
	if CompareEvaluations(tailEval, midEval) < 0 {
		return true, nil // Fouled
	}
	// Mid vs Head
	if CompareEvaluations(midEval, headEval) < 0 {
		return true, nil // Fouled
	}

	return false, nil // Valid hand arrangement
}

// Special hand check (一条龙: contains all 2..14)
func IsDragon(cards []Card) bool {
	if len(cards) != 13 {
		return false
	}
	seen := make(map[int]bool)
	for _, c := range cards {
		seen[c.Rank] = true
	}
	for r := 2; r <= 14; r++ {
		if !seen[r] {
			return false
		}
	}
	return true
}
