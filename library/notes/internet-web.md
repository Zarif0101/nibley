# How the web works

## Simple idea
Your browser and a server swap letters. You type a web address, the browser finds the server's number (DNS, like phone contacts), and sends a request: "please send this page". The server sends back a response with the page, which arrives in small pieces called packets and is put back together.

## Key formulas
- A web address (URL) = protocol + domain + path, like https://example.com/page.
- Status codes: 200 OK, 404 not found, 500 server error.

## Picture it
Draw `client-server`. Label `client-server.request`: "request", `client-server.response`: "web page". Draw `browser-window` above it.

## Common mistakes
- Thinking the internet and the web are the same: the web is one service on the internet.
- Thinking a page comes in one piece: it travels as many packets.
- Thinking https and http are the same: https is encrypted.

## Check questions
1. What does DNS do?
   Answer: Turns a website name into the server's address.
2. What does a 404 status mean?
   Answer: The page was not found.
3. Who sends the request, browser or server?
   Answer: The browser.

## Flashcards
Q: What is a server?
A: A computer that answers requests.
Q: What is a client?
A: The program that asks, like a browser.
Q: What is HTTP?
A: The rules for web requests and responses.
Q: What does the s in https mean?
A: Secure: the traffic is encrypted.
Q: What is a packet?
A: A small piece of data sent over a network.

## Root check
- input-output: Name one kind of program output. Answer: Text on screen, a file or a picture.
