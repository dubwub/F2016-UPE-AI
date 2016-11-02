package main

/*
 * Bomberman AI
 *
 * author: Matt Poegel
 */

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
)

const serverURL = "http://aicomp.io/api/"

// Strategy defines approach for choosing the next move
type Strategy interface {
	Execute(*Message) string
}

// Message defines the structure of responses from the game server
type Message struct {
	HardBlockBoard []int       `json:"hardBlockBoard"`
	BoardSize      int         `json:"boardSize"`
	GameID         string      `json:"gameID"`
	BombMap        interface{} `json:"bombMap"`
	MoveIterator   int         `json:"moveIterator"`
	PlayerID       string      `json:"playerID"`
	PortalMap      interface{} `json:"portalMap"`
	PlayerIndex    int         `json:"playerIndex"`
	TrailMap       interface{} `json:"trailMap"`
	Player         interface{} `json:"player"`
	State          string      `json:"state"`
	SoftBlockBoard []int       `json:"softBlockBoard"`
	MoveOrder      []int       `json:"moveOrder"`
	Opponent       interface{} `json:"opponent"`
}

// Player encapsulates the user's credentials
type Player struct {
	DevKey   string
	Username string
}

// NewPlayer reads the given credential file and returns a new Player
func NewPlayer(credentialFile *string) *Player {
	fp, err := os.Open(*credentialFile)
	if err != nil {
		panic(err)
	}
	defer func() {
		if err := fp.Close(); err != nil {
			panic(err)
		}
	}()

	buf := make([]byte, 1024)
	n, err := fp.Read(buf)
	if err != nil {
		panic(err)
	}
	if n == 0 {
		return nil
	}
	res := string(buf[:n])
	strres := string(res)
	bits := strings.Split(strres, "\n")
	p := &Player{bits[0], bits[1]}
	return p
}

func decodeResponse(resp *http.Response) Message {
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		panic(err)
	}
	dec := json.NewDecoder(strings.NewReader(string(body)))
	var msg Message
	if err := dec.Decode(&msg); err != nil {
		log.Print(string(body))
		panic(err)
	}
	return msg
}

// PracticeGame joins a practice game and begins making moves using the given strategy
func PracticeGame(player *Player, strategy Strategy) {
	resp, err := http.PostForm(serverURL+"games/practice",
		url.Values{"devkey": {player.DevKey}, "username": {player.Username}})
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()
	msg := decodeResponse(resp)
	log.Printf("Joined game: %s\n", msg.GameID)
	log.Printf("PlayerID: %s\n", msg.PlayerID)
	for {
		move := strategy.Execute(&msg)
		log.Printf("Move: %s\n", move)
		resp, err := http.PostForm(serverURL+"games/submit/"+msg.GameID,
			url.Values{"devkey": {player.DevKey}, "playerID": {msg.PlayerID}, "move": {move}})
		if err != nil {
			panic(err)
		}
		defer resp.Body.Close()
		msg := decodeResponse(resp)
		if msg.State == "complete" {
			break
		}
	}
	log.Printf("Game over\n")
}

func main() {
	args := os.Args
	if len(args) < 1 {
		fmt.Fprintf(os.Stderr, "Usage: go run ai.go <credential_file>\n")
		os.Exit(1)
	}
	player := NewPlayer(&args[1])
	log.Printf("Loaded credentials for: %s\n", player.Username)
	strategy := NewSuicideStrategy()
	log.Printf("Using strategy: %s\n", strategy.name)

	PracticeGame(player, strategy)
}
