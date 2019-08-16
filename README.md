# FinPeeks

FinPeeks is a tool, that allows you to take a peek into your financial Data.
FinPeeks is written in JavaScript, using D3.

### Usage
Just open the `index.html` file or visit [the FinPeeks webhost](https://tcmboby.github.io/FinPeeks/) and select your data file with the file browser.
Alternatively you can write your own html file. Just make sure, you include the `svg` elements with the appropriate ids as well as d3.

### Requirements:
- A modern web browser (only tested with Firefox 66.0.3)
- An internet connection (for the inclusion of D3)

### Data:
Your data is read from a .dsv file.
The Delimiter of your file have to be set within the settings-object in the script.
(The default delimiter is " ")
The data has to have the following format:
```
  Day Month Year Amount Product-name Flag1 Flag2 Flag3 Category
```
- Flag1 is set to a value of 'g' or 's', discriminating between goods and services.
- Flag2 is set to a value of 'o' or 'r', discriminating between one-time and regular payments.
- Flag3 is set to a value of 'n' or 'l', discriminating between necessities and luxuries.

An entry in a valid data File may look like this:
```
  9 1 2019 4.80 Cafeteria g o n food
```

An example data file can be found [here](https://github.com/TCMBoby/FinPeeks/blob/master/data/exampleData.csv).

### Example Visualizations
![Visualization of Cumulative Expenses](screenshots/cumulative.jpg?raw=true)
![Visualization of Top 5 Products](screenshots/top.jpg?raw=true)
![Visualization of Fractional Expenses](screenshots/fractional.jpg?raw=true)
