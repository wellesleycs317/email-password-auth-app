import React, { useState, useEffect } from "react";
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, ScrollView, Text, TextInput, 
         TouchableOpacity, View } from 'react-native';
import { initializeApp } from "firebase/app";
import { // access to authentication features:
         getAuth, 
         // for email/password authentication: 
         createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification,
         // for logging out:
         signOut
  } from "firebase/auth";
import { getFirestore, 
         collection, doc, addDoc, setDoc, getDocs
  } from "firebase/firestore";

// *** REPLACE THIS STUB! ***
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "...details omitted...",
  authDomain: "...details omitted...",
  projectId: "...details omitted...",
  storageBucket: "...details omitted...",
  messagingSenderId: "...details omitted...",
  appId: "...details omitted...",
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
// Add Google as an authorization provider 
// (only need if using Google to authenticate)
// const provider = new GoogleAuthProvider(firebaseApp);
const db = getFirestore(firebaseApp);

function formatJSON(jsonVal) {
  // Lyn sez: replacing \n by <br/> not necesseary if use this CSS:
  //   white-space: break-spaces; (or pre-wrap)
  // let replacedNewlinesByBRs = prettyPrintedVal.replace(new RegExp('\n', 'g'), '<br/>')
  return JSON.stringify(jsonVal, null, 2);
}

function emailOf(user) {
  if (user) {
    return user.email;
  } else {
    return null;
  }
}



export default function App() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [credential, setCredential] = React.useState(null);
  const [loggedInUser, setLoggedInUser] = React.useState(null);
  // const [waitingForRedirectCredential, setWaitingForRedirectCredential] = React.useState(false);

  // Unsubscriber variable that will be set on component mount
  let unsubscribeOnAuthStateChanged = undefined

  useEffect(() => {
      // Anything in here is fired on component mount.
      console.log('Component did mount');
      console.log(`on mount: emailOf(auth.currentUser)=${emailOf(auth.currentUser)}`);
      console.log(`on mount: emailOf(loggedInUser)=${emailOf(loggedInUser)}`);
      checkEmailVerification();
      return () => {
        // Anything in here is fired on component unmount.
        console.log('Component did unmount');
        console.log(`on unmount: emailOf(auth.currentUser)=${emailOf(auth.currentUser)}`);
        console.log(`on unmount: emailOf(loggedInUser)=${emailOf(loggedInUser)}`);
      }
    }, [])

  // Clear error message when email is updated to be nonempty
  useEffect(
    () => { if (email != '') setErrorMsg(''); },
    [email]
  ); 

  function signUpUserEmailPassword() {
    console.log('called signUpUserEmailPassword');
    if (auth.currentUser) {
      signOut(auth); // sign out auth's current user (who is not loggedInUser, 
                     // or else we wouldn't be here
    }
    if (!email.includes('@')) {
      setErrorMsg('Not a valid email address');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password too short');
      return;
    }
    // Invoke Firebase authentication API for Email/Password sign up 
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        console.log('signUpUserEmailPassword: sign up succeeded (but email still needs verification');

        // Clear email/password inputs
        const savedEmail = email; // Save for email verification
        setEmail('');
        setPassword('');

        // Note: could store userCredential here if wanted it later ...
        // console.log(`createUserWithEmailAndPassword: setCredential`);
        // setCredential(userCredential);

        // Send verication email
        console.log('signUpUserEmailPassword: about to send verification email');
        sendEmailVerification(auth.currentUser)
        .then(() => {
            console.log('signUpUserEmailPassword: sent verification email');
            setErrorMsg(`A verification email has been sent to ${savedEmail}. You will not be able to sign in to this account until you click on the verification link in that email.`); 
            // Email verification sent!
            // ...
          });
      })
      .catch((error) => {
        console.log('signUpUserEmailPassword: sign up failed!');
        const errorMessage = error.message;
        // const errorCode = error.code; // Could use this, too.
        console.log(`createUserWithEmailAndPassword: ${errorMessage}`);
        setErrorMsg(`createUserWithEmailAndPassword: ${errorMessage}`);
      });
  }

  function signInUserEmailPassword() {
    console.log('called signInUserEmailPassword');
    console.log(`signInUserEmailPassword: emailOf(currentUser)0=${emailOf(auth.currentUser)}`); 
    console.log(`signInUserEmailPassword: emailOf(loggedInUser)0=${emailOf(loggedInUser)}`); 
    // Invoke Firebase authentication API for Email/Password sign in 
    // Use Email/Password for authentication 
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        console.log(`signInUserEmailPassword succeeded; have userCredential for auth.currentUser=${auth.currentUser} (but may not be verified)`); 
        console.log(`signInUserEmailPassword: emailOf(currentUser)1=${emailOf(auth.currentUser)}`); 
        console.log(`signInUserEmailPassword: emailOf(loggedInUser)1=${emailOf(loggedInUser)}`); 

        // Only log in auth.currentUser if their email is verified
        checkEmailVerification();

        // Clear email/password inputs 
        setEmail('');
        setPassword('');

        // Note: could store userCredential here if wanted it later ...
        // console.log(`createUserWithEmailAndPassword: setCredential`);
        // setCredential(userCredential);
    
        })
      .catch((error) => {
        console.log('signUpUserEmailPassword: sign in failed!');
        const errorMessage = error.message;
        // const errorCode = error.code; // Could use this, too.
        console.log(`signInUserEmailPassword: ${errorMessage}`);
        setErrorMsg(`signInUserEmailPassword: ${errorMessage}`);
      });
  }

  function checkEmailVerification() {
    if (auth.currentUser) {
      console.log(`checkEmailVerification: auth.currentUser.emailVerified={auth.currentUser.emailVerified}`);
      if (auth.currentUser.emailVerified) {
        console.log(`checkEmailVerification: setLoggedInUser for ${auth.currentUser.email}`);
        setLoggedInUser(auth.currentUser);
        console.log("checkEmailVerification: setErrorMsg('')")
        setErrorMsg('')
      } else {
        console.log('checkEmailVerification: remind user to verify email');
        setErrorMsg(`You cannot sign in as ${auth.currentUser.email} until you verify that this is your email address. You can verify this email address by clicking on the link in a verification email sent by this app to ${auth.currentUser.email}.`)
      }
    }
  }

  function logOut() {
    console.log('logOut'); 
    console.log(`in logOut, setLoggedInUser(null)`);
    setLoggedInUser(null);
    signOut(auth); // Will eventually set auth.currentUser to null     
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="auto" />
      <View style={loggedInUser === null ? styles.loginLogoutPane : styles.hidden}>
        <View style={styles.labeledInput}>
          <Text style={styles.inputLabel}>Email:</Text>
          <TextInput placeholder="Enter an email address" 
            style={styles.textInput} 
            value={email} 
            onChangeText={ textVal => setEmail(textVal)} />
        </View>
        <View style={styles.labeledInput}>
          <Text style={styles.inputLabel}>Password:</Text>
          <TextInput placeholder="Enter a password" 
            style={styles.textInput} 
            value={password} 
            onChangeText={ textVal => setPassword(textVal)} />
        </View>
        <View style={styles.buttonHolder}>
          <TouchableOpacity style={styles.button}
             onPress={() => signUpUserEmailPassword()}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity> 
          <TouchableOpacity style={styles.button}
             onPress={() => signInUserEmailPassword()}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity> 
        </View>
        <View style={errorMsg === '' ? styles.hidden : styles.errorBox}>
          <Text style={styles.errorMessage}>{errorMsg}</Text>
        </View>
      </View>
      <View style={loggedInUser === null ? styles.hidden : styles.loginLogoutPane}>
          <TouchableOpacity style={styles.button}
             onPress={() => logOut()}>
            <Text style={styles.buttonText}>Log Out</Text>
          </TouchableOpacity> 
      </View>
      <ScrollView style={styles.jsonContainer}>
        <Text style={styles.json}>Logged In User: {formatJSON(loggedInUser)}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: Constants.statusBarHeight,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  }, 
  loginLogoutPane: {
      flex: 3, 
      alignItems: 'center',
      justifyContent: 'center',
  }, 
  labeledInput: {
      width: "100%",
      alignItems: 'center',
      justifyContent: 'center',
  }, 
  inputLabel: {
      fontSize: 20,
  }, 
  textInput: {
      width: "80%",
      fontSize: 20,
      borderRadius: 5,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderColor: "rgba(0, 0, 0, 0.2)",
      borderWidth: 1,
      marginBottom: 8,
  },
  buttonHolder: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',

  },
  button: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderRadius: 10,
      elevation: 3,
      backgroundColor: 'blue',
      margin: 5,
  },
  buttonText: {
      fontSize: 20,
      lineHeight: 21,
      fontWeight: 'bold',
      letterSpacing: 0.25,
      color: 'white',
  },
  errorBox: {
      width: '80%',
      borderWidth: 1,
      borderStyle: 'dashed', // Lyn sez: doesn't seem to work 
      borderColor: 'red',
  },
  errorMessage: {
      color: 'red',
      padding: 10, 
  },
  hidden: {
      display: 'none',
  },
  visible: {
      display: 'flex',
  },
  jsonContainer: {
      flex: 1,
      width: '98%',
      borderWidth: 1,
      borderStyle: 'dashed', // Lyn sez: doesn't seem to work 
      borderColor: 'blue',
  },
  json: {
      padding: 10, 
      color: 'blue', 
  },

});
