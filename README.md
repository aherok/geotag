# Geotag

A (working!) PoC to easily save geolocation data (latitude, longitude) inside photos using GPX file data recorded during photo capture.

``` text
DISCLAIMER: This project is provided "as is" without any warranty, express or implied. 
Although I use the project on my personal data without issues, I take no responsibility for any damage or loss caused by the use of this software. It is the user's responsibility to ensure that the software is used appropriately and safely.
```

## Installation

Simply clone the respository.

``` cmd
git clone git@github.com:aherok/geotag.git
yarn
```

After installing development version, run it by invoking a command via npm or yarn:

``` cmd
yarn geotag <dir>
```

You can also install the software to the system:

``` cmd
npm install -g .
```

Now you can run the command directly:

``` cmd
geotag <dir>
```

## Usage

_Remember to use `yarn geotag` or `geotag` depending on the installation varian chosen._

Quick usage

``` cmd
geotag <dir>
```

Full-fledged example.

* Find photos in the `~/photos` dir
* look for GPX files inside `~/gpx` dir
* do not modify files that already contain geolocation data
* allow for 1hr `precision` when looking for precise timestamp
* if not found particular timestamp, use the default coordinates
* remove backup files (that are created by default)

``` cmd
geotag ~/photos/ --gpx-dir ~/gpx/ --only-new 1 --precision 3600 --default-coords 18.2,50,5 --remove-original 1
```

## Contributing

Feel free to contribute to this project by creating pull requests with improvements or bug fixes.  
I would be particularly grateful for help with writing tests :)
