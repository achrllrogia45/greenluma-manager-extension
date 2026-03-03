GreenLuma Manager To-Do List: {

- [???]  Change all codes to React+Vite environment.
- [OK] Add pin to the sidebar functionality and open in full size tab.
- [OK] Add manual input Game List at the header: {
      [OK] Popup window with close button
      [OK] Add description for pasting code for every line hovering the paste bar
      [OK]  paste APP ID Code into paste bar, within every code div by space
      [OK] add checker list, OK list by very bottom using the same style as strip line from Fetch List, and Delete List as the
          as Games List
      [OK] generate 'DLC' if url ../app/{game_name}__  had 2 underscore
      [OK] auto generate steamdb and steam store link by the AppID, 
      [OK] Add manual input Game List to the sidebar: {
      }
- [+] Fixing resizer functionality.
- [+] Drag-n-drop from Steam Store and SteamDB page to the app to add the game/DLC to the manual.List.
- 

Search engine: {
  Steam API/Store: {

 - [OK] Search by ID to display all of the DLCs.
 - [OK] Add Pop up display for previewing the image/website by hover to AppID number.
 - [OK] Add open in new tab on the AppID number (AppID has link to Steam Store), hover to show tooltip open in new tab
 - [OK] Deleting Search Bar, changed to APP ID only search and its DLCs listed.
 
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
 - [OK] Rearange multiple list by selected
 - [OK] Add Search for Added Game list
 - [OK] Add Manual change "Type" by selected list
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