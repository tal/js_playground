set :views, 'components'

helpers do
  def component_path f
    File.expand_path(File.join("./components",f))
  end

  def exist? f
    full = component_path f
    File.exist?(full)
  end

  def component? f
    exist?(File.join(@component, f))
  end

  def get_css file
    file = File.join('css',file)

    try = [
      File.join(@component,file+'.css'),
      File.join(@component,file+'.scss'),
      file+'.css',
      file+'.scss'
    ]

    if found = try.find {|f| exist?(f)}
      io = File.read(File.expand_path('components/'+found))
      if found =~ /scss$/
        scss io
      else
        io
      end
    else
      ''
    end
  end

  def get_js file
    file = File.join('js',file)

    try = [
      File.join(@component,file+'.js'),
      File.join(@component,file+'.coffee'),
      file+'.js',
      file+'.coffee'
    ]

    if found = try.find {|f| exist?(f)}
      io = File.read(File.expand_path('components/'+found))
      if found =~ /coffee$/
        coffee io
      else
        io
      end
    else
      ''
    end
  end
end

get '/:component/js/*' do
  @component = params[:component]

  content_type :js
  get_js(params[:splat].first.sub(/\.js$/,''))
end

get '/:component/css/*' do
  @component = params[:component]

  content_type :css
  get_css(params[:splat].first.sub(/\.css$/,''))
end

get '/:component/:page' do
  @component = params[:component]
  @page = params[:page]

  if exist?("#{@component}.erb")
    layout = @component.to_sym
  else
    layout = :base
  end

  begin
    erb :"#{params[:component]}/#{@page}", layout: layout
  rescue Errno::ENOENT
    404
  end
end

get '/:component' do
  @component = params[:component]

  if exist?("#{@component}.erb")
    layout = @component.to_sym
  else
    layout = :base
  end

  begin
    erb :"#{params[:component]}/body", layout: layout
  rescue Errno::ENOENT
    404
  end
end
