require 'rubygems'
require 'bundler/setup'

require 'sinatra'
require 'sinatra/respond_with'
require 'sass'
require 'coffee-script'
require './app'

run Sinatra::Application
