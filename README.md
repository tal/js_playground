JS Playground
=============

My space to play around with frontend shit

## Running

My reccomendation is to run this with [pow!](http://pow.cx). Then you can link this repo up to a hostname.

eg:

```sh
$ cd ~/.pow
$ ln -s /path/to/myapp js
```

Then you can access the components at `http://js.dev/my_component`

If you want you can make multiple links and access the same code on different hostnames

```sh
$ cd ~/.pow
$ ln -s /path/to/myapp js2
```

Makes `http://js.dev/my_component` and `http://js2.dev/my_component` the same.

## Using

Each component lives in a folder inside components. The component in `components/foo` can be reached at the url `/foo`.
It will automatically include the base js and css files to bootstrap you. Or else you can override with sass/css or
coffee/js.
