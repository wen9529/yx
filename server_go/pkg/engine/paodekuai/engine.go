package paodekuai

import (
	"errors"
	"sort"
)

type Card struct {
	ID      string `json:"id"`
	Suit    string `json:"suit"` // spade, heart, club, diamond
	Rank    int    `json:"rank"` // 3..15 (A=14, 2=15)
	Display string `json:"display"`
}

type PatternType int

const (
	PatternNone PatternType = iota
	PatternSingle
	PatternPair
	PatternTrio
	PatternTrioWithCards // 跑得快三带二或三带一 (最后一手允许三带一)
	PatternStraight      // 5+
	PatternChainPair     // 2+ consecutive pairs
	PatternAirplane
	PatternBomb          // 4 cards of same rank
)

type HandEvaluation struct {
	Type        PatternType
	PrimaryRank int
	Length      int
}

// EvaluatePaoDeKuai evaluates hand play in 跑得快
func EvaluatePaoDeKuai(cards []Card, isLastHand bool) (HandEvaluation, error) {
	n := len(cards)
	if n == 0 {
		return HandEvaluation{Type: PatternNone}, errors.New("empty play")
	}

	ranks := make([]int, n)
	for i, c := range cards {
		ranks[i] = c.Rank
	}
	sort.Sort(sort.Reverse(sort.IntSlice(ranks)))

	freq := make(map[int]int)
	for _, r := range ranks {
		freq[r]++
	}

	// Single
	if n == 1 {
		return HandEvaluation{Type: PatternSingle, PrimaryRank: ranks[0], Length: 1}, nil
	}

	// Pair
	if n == 2 && ranks[0] == ranks[1] {
		return HandEvaluation{Type: PatternPair, PrimaryRank: ranks[0], Length: 2}, nil
	}

	// Bomb (4 of a kind)
	if n == 4 && len(freq) == 1 {
		return HandEvaluation{Type: PatternBomb, PrimaryRank: ranks[0], Length: 4}, nil
	}

	// Trio (pure)
	if n == 3 && len(freq) == 1 {
		return HandEvaluation{Type: PatternTrio, PrimaryRank: ranks[0], Length: 3}, nil
	}

	// Trio + cards (5 cards: 3+2 in standard, or 4 cards 3+1 if isLastHand)
	var trioRank int
	for r, count := range freq {
		if count >= 3 {
			trioRank = r
		}
	}
	if trioRank > 0 {
		if n == 5 {
			return HandEvaluation{Type: PatternTrioWithCards, PrimaryRank: trioRank, Length: 5}, nil
		}
		if n == 4 && isLastHand {
			return HandEvaluation{Type: PatternTrioWithCards, PrimaryRank: trioRank, Length: 4}, nil
		}
	}

	// Straight (>= 5 cards, 2 cannot be in straight)
	if n >= 5 && len(freq) == n && ranks[0] < 15 {
		consecutive := true
		for i := 0; i < n-1; i++ {
			if ranks[i]-ranks[i+1] != 1 {
				consecutive = false
				break
			}
		}
		if consecutive {
			return HandEvaluation{Type: PatternStraight, PrimaryRank: ranks[0], Length: n}, nil
		}
	}

	// Chain pairs (>= 2 pairs, 4+ cards)
	if n >= 4 && n%2 == 0 {
		pairsOk := true
		pairRanks := make([]int, 0, n/2)
		for r, count := range freq {
			if count != 2 || r >= 15 {
				pairsOk = false
				break
			}
			pairRanks = append(pairRanks, r)
		}
		if pairsOk && len(pairRanks) == n/2 {
			sort.Sort(sort.Reverse(sort.IntSlice(pairRanks)))
			isCons := true
			for i := 0; i < len(pairRanks)-1; i++ {
				if pairRanks[i]-pairRanks[i+1] != 1 {
					isCons = false
					break
				}
			}
			if isCons {
				return HandEvaluation{Type: PatternChainPair, PrimaryRank: pairRanks[0], Length: n}, nil
			}
		}
	}

	return HandEvaluation{Type: PatternNone}, errors.New("invalid pattern in PaoDeKuai")
}

// CanBeat checks if newHand beats prevHand
func CanBeat(newHand, prevHand HandEvaluation) bool {
	// Bomb beats non-bomb
	if newHand.Type == PatternBomb && prevHand.Type != PatternBomb {
		return true
	}
	if newHand.Type != PatternBomb && prevHand.Type == PatternBomb {
		return false
	}
	if newHand.Type == PatternBomb && prevHand.Type == PatternBomb {
		return newHand.PrimaryRank > prevHand.PrimaryRank
	}

	if newHand.Type != prevHand.Type || newHand.Length != prevHand.Length {
		return false
	}

	return newHand.PrimaryRank > prevHand.PrimaryRank
}

// HasSpadeThree checks if card is 黑桃3
func HasSpadeThree(cards []Card) bool {
	for _, c := range cards {
		if c.Rank == 3 && c.Suit == "spade" {
			return true
		}
	}
	return false
}
