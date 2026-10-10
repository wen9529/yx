package mahjong

import (
	"errors"
	"sort"
)

type Suit string

const (
	Wan  Suit = "wan"  // 万
	Tiao Suit = "tiao" // 条
	Tong Suit = "tong" // 筒
)

type Tile struct {
	ID      string `json:"id"`
	Suit    Suit   `json:"suit"`
	Value   int    `json:"value"` // 1..9
	Display string `json:"display"`
}

type MeldType string

const (
	MeldPong MeldType = "PONG" // 碰
	MeldKong MeldType = "KONG" // 杠
	MeldChow MeldType = "CHOW" // 吃
)

type Meld struct {
	Type  MeldType `json:"type"`
	Tiles []Tile   `json:"tiles"`
}

// CanPong checks if player has 2 identical tiles in hand to pong targetTile
func CanPong(hand []Tile, target Tile) bool {
	count := 0
	for _, t := range hand {
		if t.Suit == target.Suit && t.Value == target.Value {
			count++
		}
	}
	return count >= 2
}

// CanKong checks if player has 3 identical tiles to kong targetTile
func CanKong(hand []Tile, target Tile) bool {
	count := 0
	for _, t := range hand {
		if t.Suit == target.Suit && t.Value == target.Value {
			count++
		}
	}
	return count >= 3
}

// CheckHu verifies if the tile set can win (Standard 3N+2 or 7 Pairs)
func CheckHu(hand []Tile, melds []Meld, missingSuit Suit) bool {
	totalTiles := append([]Tile{}, hand...)

	// In Sichuan Mahjong, cannot have missing suit in hand
	for _, t := range totalTiles {
		if t.Suit == missingSuit {
			return false
		}
	}
	for _, m := range melds {
		for _, t := range m.Tiles {
			if t.Suit == missingSuit {
				return false
			}
		}
	}

	// Check Seven Pairs (14 tiles, no melds, 7 pairs)
	if len(hand) == 14 && len(melds) == 0 && checkSevenPairs(hand) {
		return true
	}

	// Standard 3N + 2 check
	return checkStandardHu(hand)
}

func checkSevenPairs(hand []Tile) bool {
	if len(hand) != 14 {
		return false
	}
	freq := make(map[string]int)
	for _, t := range hand {
		k := string(t.Suit) + ":" + string(rune(t.Value+'0'))
		freq[k]++
	}
	for _, count := range freq {
		if count%2 != 0 {
			return false
		}
	}
	return true
}

// Standard 3N+2 recursive search
func checkStandardHu(hand []Tile) bool {
	n := len(hand)
	if n%3 != 2 {
		return false
	}

	// Group by suit
	suitGroups := map[Suit][]int{
		Wan:  {},
		Tiao: {},
		Tong: {},
	}
	for _, t := range hand {
		suitGroups[t.Suit] = append(suitGroups[t.Suit], t.Value)
	}

	for _, list := range suitGroups {
		sort.Ints(list)
	}

	// Exactly one suit group must have length % 3 == 2 (the pair/eye),
	// and the other groups must have length % 3 == 0.
	var pairSuit Suit
	pairSuitFound := false

	for suit, list := range suitGroups {
		rem := len(list) % 3
		if rem == 2 {
			if pairSuitFound {
				return false // multiple suits have pair remainder
			}
			pairSuit = suit
			pairSuitFound = true
		} else if rem != 0 {
			return false
		}
	}

	if !pairSuitFound {
		return false
	}

	// Verify all other suits can be decomposed completely into melds (triplets / sequences)
	for suit, list := range suitGroups {
		if suit != pairSuit {
			if !canDecomposeMelds(list) {
				return false
			}
		}
	}

	// For the pair suit, test every possible pair
	return canDecomposeWithPair(suitGroups[pairSuit])
}

func canDecomposeWithPair(values []int) bool {
	n := len(values)
	for i := 0; i < n-1; i++ {
		if values[i] == values[i+1] {
			// Extract pair
			rest := append([]int{}, values[:i]...)
			rest = append(rest, values[i+2:]...)
			if canDecomposeMelds(rest) {
				return true
			}
			for i < n-1 && values[i] == values[i+1] {
				i++ // skip duplicate pairs
			}
		}
	}
	return false
}

func canDecomposeMelds(values []int) bool {
	if len(values) == 0 {
		return true
	}
	first := values[0]

	// Try triplet (first, first, first)
	if len(values) >= 3 && values[1] == first && values[2] == first {
		if canDecomposeMelds(values[3:]) {
			return true
		}
	}

	// Try sequence (first, first+1, first+2)
	idx1 := -1
	idx2 := -1
	for i := 1; i < len(values); i++ {
		if values[i] == first+1 && idx1 == -1 {
			idx1 = i
		}
		if values[i] == first+2 && idx2 == -1 {
			idx2 = i
		}
	}
	if idx1 != -1 && idx2 != -1 {
		rest := make([]int, 0, len(values)-3)
		for i := 1; i < len(values); i++ {
			if i != idx1 && i != idx2 {
				rest = append(rest, values[i])
			}
		}
		if canDecomposeMelds(rest) {
			return true
		}
	}

	return false
}

// CalculateFan calculates multiplier fans (清一色, 七对, 碰碰胡)
func CalculateFan(hand []Tile, melds []Meld) (int, []string) {
	fan := 1
	var reasons []string

	// Check Pure Suit (清一色: all same suit)
	suits := make(map[Suit]bool)
	for _, t := range hand {
		suits[t.Suit] = true
	}
	for _, m := range melds {
		for _, t := range m.Tiles {
			suits[t.Suit] = true
		}
	}
	if len(suits) == 1 {
		fan *= 4
		reasons = append(reasons, "清一色 (4倍)")
	}

	// Seven pairs (七对)
	if checkSevenPairs(hand) {
		fan *= 4
		reasons = append(reasons, "七对 (4倍)")
	}

	if len(reasons) == 0 {
		reasons = append(reasons, "平胡 (1倍)")
	}

	return fan, reasons
}
