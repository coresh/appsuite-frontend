# gem install watchr
# gem install ruby-fsevent (On Mac OS X)
# or
# gem install rev (on Linux)
# watchr autodeploy.rb

#https://github.com/mynyml/watchr

def build 
  retval = system("./build.sh debug=true")
  failure unless retval
  true
end

def failure
  system("growlnotify -n \"OX 7 UI Build\" -m \"Build failed!\"")
end

watch("\.js$") { build }
watch("\.css$") { build }
watch("\.less$") { build }
watch("\.html$") { build }
watch("^doc") { build }
