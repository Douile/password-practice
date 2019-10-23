# Password-Practice

View on [github.io](https://douile.github.io/password-practice/)

This small site aims to help you learn more complex passwords, by letting you easily try them as many times as you want.

_This site is not for storing passwords._

## How to use

You must be using a modern browser that supports crypto libraries ([Crypto](https://caniuse.com/#feat=mdn-api_crypto) & [SubtleCrypto](https://caniuse.com/#feat=mdn-api_crypto_subtle))

- To add a password input the name and password at the top of the page then press enter.
- To attempt a password use the Attempt password field, then use enter to submit.
- To delete a password click on the Delete button.

## Security

Whilst security cannot be guaranteed in any regular web browser I have attempted to provide the best possible using the following methods

- Passwords are immediately converted to salted SHA-512 hashes after entry (I cannot account for the browser's garbage collection)
- No server; the passwords are all stored using [local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) therefore there are no HTTP requests to be intercepted
- No external dependencies, this site is written entirely using [VanillaJS](http://vanilla-js.com/) so libraries can't get access to your browser

## TODO

- Give each password a memorisation score, calculated using some function of how long after creation attempted correctly
- Remind users to attempt their passwords at intervals after they are inputted
- Come up with a better name
- Add some pretty images
- Add PWA config
