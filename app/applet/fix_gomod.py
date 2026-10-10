with open('server_go/go.mod', 'w') as f:
    f.write("module github.com/gamehall/monolith\n\ngo 1.22.0\n\nrequire (\n\tgithub.com/redis/go-redis/v9 v9.5.1\n)\n\nreplace github.com/gamehall/monolith => .\n")
print("Done")
