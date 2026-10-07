Email = example@example.com
Password = String123

#launch the app

- npm install
- npm run dev

#run the tests

- npm test

#Key Points
I created a class for all requests so that I could conveniently manage responses and add the necessary safeguards, such as protection against “Concurrent Requests.” I catch cases where a request ends with a 401 status, trigger `rotate`, and save its promise. All subsequent requests see that this promise is not empty and wait for it to complete. After it completes successfully, I restart them using their bodies. I also added a condition so that new requests won’t start until the `rotate` promise has finished.
