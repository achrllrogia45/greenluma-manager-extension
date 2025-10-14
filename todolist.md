GreenLuma Manager To-Do List: {

- [???]  Change all codes to React+Vite environment.
- [+] Add pin icon to not close the window when click outside.
- [+] Drag-n-drop from Steam Store and SteamDB page to the app to add the game/DLC to the list.
- [+] Add paste clipboard to add bulk games/DLCs to the list.
- [+] Fixing resizer functionality.
- [+] Add pin to the sidebar functionality and open in full size tab.

Search engine: {
  Steam API/Store: {

 - [OK] Search by ID to display all of the DLCs.
 - [OK] Add Pop up display for previewing the image/website by hover to AppID number.
 - [OK] Add open in new tab on the AppID number (AppID has link to Steam Store), hover to show tooltip open in new tab.
}
},

Down Button: {
 - [OK] extract to JSON of the AppID, Name, Type, and Link to Steam Store/SteamDB to the down list.
},

Games List: {
 - [OK] Store the list to local storage.
 - [OK] Load the list from local storage when open the app.
 - [OK] Funtionally Clear Button to clear selected list.
 - [OK] Export: Priority, AppID, Name , Type, Link to Steam Store/SteamDB to JSON file.
 - [OK] AVOID DUPLICATE AppID when importing the list.
},

Clear Button: {
 - [OK] Clear the list.
 - [OK] Add confirmation dialog when clearing the list.
},

Export/Import: {
  - [OK] Export the list to JSON file.
  - [OK] Import the list from JSON file.
  - [OK] Make the import function will stacked to the existing list by going to the latest priority.
  - [OK] Save the list to local storage after importing.
},

Generate Button: {
  - [+] Add Settings button
      - [+] Generate the code of `.bat` to steam path file inside the code (ECHO)
      
  - [OK] Generate into filled text `.bat` file (Windows). Using `ECHO {AppID}>{Priority}.txt`. 
  - [OK] Generate into filled text `.txt` files
}

}