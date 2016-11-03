package main

// SuicideStrategy is strategy that immediately suicides
type SuicideStrategy struct {
	name  string
	count int
}

// Execute calculates the next move given this strategy
func (strategy *SuicideStrategy) Execute(msg *Message) string {
	var move string
	if strategy.count == 0 {
		move = "b"
	} else {
		move = ""
	}
	strategy.count++
	return move
}

// NewSuicideStrategy creates a new SuicideStrategy
func NewSuicideStrategy() *SuicideStrategy {
	s := SuicideStrategy{"suicide", 0}
	return &s
}
