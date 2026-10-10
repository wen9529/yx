package doudizhu

import (
	"errors"
	"sort"
)

// Card represents a poker card in Doudizhu
type Card struct {
	ID      string `json:"id"`
	Suit    string `json:"suit"` // spade, heart, club, diamond, joker
	Rank    int    `json:"rank"` // 3..15 (3..A,2), 16: Black Joker, 17: Red Joker
	Display string `json:"display"`
}

// HandPattern represents hand card combo type
type HandPattern int

const (
	PatternInvalid HandPattern = iota
	PatternSolo                // 单张
	PatternPair                // 对子
	PatternTrio                // 三张
	PatternTrioSolo            // 三带一
	PatternTrioPair            // 三带二
	PatternStraight            // 顺子 (>=5 cards)
	PatternChainPair           // 连对 (>=3 pairs)
	PatternPlane               // 飞机 (>=2 trios without wings)
	PatternPlaneSolo           // 飞机带单
	PatternPlanePair           // 飞机带对
	PatternFourTwoSolo         // 四带二单
	PatternFourTwoPair         // 四带二对
	PatternBomb                // 普通炸弹 (4 of a kind)
	PatternRocket              // 王炸 / 火箭 (双王)
)

type ParsedHand struct {
	Pattern   HandPattern
	PrimaryRank int // primary rank used for comparison
	Length    int   // total cards
	StraightLen int // e.g. 5 for 5-straight, 2 for 2-plane
}

// EvaluateHand evaluates cards to determine hand pattern and comparative rank
func EvaluateHand(cards []Card) (ParsedHand, error) {
	n := len(cards)
	if n == 0 {
		return ParsedHand{Pattern: PatternInvalid}, errors.New("empty cards")
	}

	// Sort ranks descending
	ranks := make([]int, n)
	for i, c := range cards {
		ranks[i] = c.Rank
	}
	sort.Sort(sort.Reverse(sort.IntSlice(ranks)))

	// Check Rocket (Double Jokers)
	if n == 2 && ranks[0] == 17 && ranks[1] == 16 {
		return ParsedHand{Pattern: PatternRocket, PrimaryRank: 17, Length: 2}, nil
	}

	// Count occurrences of each rank
	countMap := make(map[int]int)
	for _, r := range ranks {
		countMap[r]++
	}

	// Group ranks by frequencies
	var singles, pairs, trios, quads []int
	for r, count := range countMap {
		switch count {
		case 1:
			singles = append(singles, r)
		case 2:
			pairs = append(pairs, r)
		case 3:
			trios = append(trios, r)
		case 4:
			quads = append(quads, r)
		}
	}
	sort.Sort(sort.Reverse(sort.IntSlice(singles)))
	sort.Sort(sort.Reverse(sort.IntSlice(pairs)))
	sort.Sort(sort.Reverse(sort.IntSlice(trios)))
	sort.Sort(sort.Reverse(sort.IntSlice(quads)))

	// Single
	if n == 1 {
		return ParsedHand{Pattern: PatternSolo, PrimaryRank: ranks[0], Length: 1}, nil
	}
	// Pair
	if n == 2 && len(pairs) == 1 {
		return ParsedHand{Pattern: PatternPair, PrimaryRank: pairs[0], Length: 2}, nil
	}
	// Bomb (4 cards of same rank)
	if n == 4 && len(quads) == 1 {
		return ParsedHand{Pattern: PatternBomb, PrimaryRank: quads[0], Length: 4}, nil
	}
	// Trio
	if n == 3 && len(trios) == 1 {
		return ParsedHand{Pattern: PatternTrio, PrimaryRank: trios[0], Length: 3}, nil
	}
	// Trio + Single (3+1)
	if n == 4 && len(trios) == 1 && len(singles) == 1 {
		return ParsedHand{Pattern: PatternTrioSolo, PrimaryRank: trios[0], Length: 4}, nil
	}
	// Trio + Pair (3+2)
	if n == 5 && len(trios) == 1 && len(pairs) == 1 {
		return ParsedHand{Pattern: PatternTrioPair, PrimaryRank: trios[0], Length: 5}, nil
	}
	// Four + Two Singles (4+2)
	if n == 6 && len(quads) == 1 && (len(singles) == 2 || len(pairs) == 1) {
		return ParsedHand{Pattern: PatternFourTwoSolo, PrimaryRank: quads[0], Length: 6}, nil
	}
	// Four + Two Pairs (4+2*2=8)
	if n == 8 && len(quads) == 1 && len(pairs) == 2 {
		return ParsedHand{Pattern: PatternFourTwoPair, PrimaryRank: quads[0], Length: 8}, nil
	}

	// Straight (>= 5 cards, cannot include 2 or Jokers, ranks strictly consecutive)
	if n >= 5 && len(singles) == n {
		if isConsecutive(ranks) && ranks[0] < 15 {
			return ParsedHand{Pattern: PatternStraight, PrimaryRank: ranks[0], Length: n, StraightLen: n}, nil
		}
	}

	// Chain Pairs (>= 3 pairs consecutive, no 2 or Jokers)
	if n >= 6 && n%2 == 0 && len(pairs) == n/2 {
		if isConsecutive(pairs) && pairs[0] < 15 {
			return ParsedHand{Pattern: PatternChainPair, PrimaryRank: pairs[0], Length: n, StraightLen: len(pairs)}, nil
		}
	}

	// Airplane pure (>= 2 trios consecutive, no 2 or Jokers)
	if len(trios) >= 2 && isConsecutive(trios) && trios[0] < 15 {
		tLen := len(trios)
		// Pure plane
		if n == tLen*3 {
			return ParsedHand{Pattern: PatternPlane, PrimaryRank: trios[0], Length: n, StraightLen: tLen}, nil
		}
		// Plane with singles: n == tLen * 4
		wingCount := n - tLen*3
		if wingCount == tLen {
			return ParsedHand{Pattern: PatternPlaneSolo, PrimaryRank: trios[0], Length: n, StraightLen: tLen}, nil
		}
		// Plane with pairs: n == tLen * 5
		if wingCount == tLen*2 && len(pairs) == tLen {
			return ParsedHand{Pattern: PatternPlanePair, PrimaryRank: trios[0], Length: n, StraightLen: tLen}, nil
		}
	}

	return ParsedHand{Pattern: PatternInvalid}, errors.New("invalid card pattern")
}

// CanBeat checks whether incoming newHand beats previousHand
func CanBeat(newHand, prevHand ParsedHand) bool {
	// Rocket beats everything
	if newHand.Pattern == PatternRocket {
		return true
	}
	if prevHand.Pattern == PatternRocket {
		return false
	}
	// Bomb beats non-bomb
	if newHand.Pattern == PatternBomb && prevHand.Pattern != PatternBomb {
		return true
	}
	// Bomb vs Bomb
	if newHand.Pattern == PatternBomb && prevHand.Pattern == PatternBomb {
		return newHand.PrimaryRank > prevHand.PrimaryRank
	}

	// Same pattern matching required
	if newHand.Pattern != prevHand.Pattern {
		return false
	}
	if newHand.Length != prevHand.Length {
		return false
	}
	if newHand.StraightLen != prevHand.StraightLen {
		return false
	}

	return newHand.PrimaryRank > prevHand.PrimaryRank
}

func isConsecutive(arr []int) bool {
	for i := 0; i < len(arr)-1; i++ {
		if arr[i]-arr[i+1] != 1 {
			return false
		}
	}
	return true
}
