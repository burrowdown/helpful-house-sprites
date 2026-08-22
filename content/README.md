## Instructions for updating the values in these files

### Making changes

`form-lists.json` and `testimonials.json` determine the content of the relevant sections of the page, they will update when you update them, and automatically re-deploy when you save them. (This will take a few minutes.) These are both JSON files.

JSON is a special format that follows these rules:

- Keys must be wrapped in double quotes (not single quotes)
- Values must be either
  - `strings` (wrapped in double quotes),
  - `arrays` (wrapped in square brackets),
  - or `objects` (curly brackets, with contents following the same rule as JSON in general)
- **No trailing commas.** All values must be comma separated, _**but**_ there cannot be a "trailing" comma after the last value.

The whole file will not be parsed if any of these conditions are not met. To help make sure your JSON is valid, try using an online [JSON Validator](https://jsonlint.com/), which will point out any formatting errors. It's also possible that opening files with "github.dev" would work well, but that's a newish feature and I've never tried it!

### Save, commit, and push

If you want a lesson on how to use the desktop client GitHub Desktop, or even the command line, to update files on GitHub, just let me know and I'd be happy to show you!

For non-code files though, it's very easy to edit them right here on GitHub.

- Open any file, and click on the pencil icon in the top right corner. (The dropdown next to it is where you would select github.dev if you want to try it)
- This will open an editor, and you simply make your changes here
- When finished, hit the big green "Commit changes" button
- When you do you will be prompted to write a commit message
  - These commit messages are permanent and visible to anyone looking at this repository, so keep it professional! Something like "update cleaning products list" will do just fine.

Once the file is saved or 'pushed', it will automatically trigger a deployment and you can see your changes on the site in a few minutes.
