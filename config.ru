require 'rubygems'
require 'bundler/setup'

require 'sinatra'
require 'sinatra/respond_with'
require 'sass'
require 'coffee-script'
# require 'sass/plugin/rack'
# require 'rack/coffee'
require './app'

# use scss for stylesheets
# Sass::Plugin.options[:style] = :compressed
# use Sass::Plugin::Rack

# use coffeescript for javascript
# use Rack::Coffee, root: 'public', urls: '/javascripts'

run Sinatra::Application
