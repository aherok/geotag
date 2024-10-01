# Geotag

A (working!) PoC to easily save geolocation data (latitude, longitude) inside photos using GPX file data recorded during photo capture.

``` text
DISCLAIMER: This project is provided "as is" without any warranty, express or implied. 
Although I use the project on my personal data without issues, I take no responsibility for any damage or loss caused by the use of this software. It is the user's responsibility to ensure that the software is used appropriately and safely.
```

## Usage

Quick usage

``` cmd
$ geotag <dir-with-photos-and-gpxes>
```

Full-fledged example.

* Find photos in `~/photos`
* look for GPX files inside `~/gpx` dir
* do not modify files that already contain geolocation data
* allow for 1hr `precision` when looking for precise timestamp
* if not found particular timestamp, use the default coordinates

``` cmd
$ geotag ~/photos/ --gpx-dir ~/gpx/ --only-new 1 --precision 3600 --default-coords 18.2,50,5
```

## Contributing

Feel free to contribute to this project by creating pull requests with improvements or bug fixes.  
I would be particularly grateful for help with writing tests :)
