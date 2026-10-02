#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
source_dir=$script_dir/picocalc
bin_dir=${GTDEV_BIN_DIR:-$HOME/bin}
config_dir=${GTDEV_CONFIG_DIR:-$HOME/.config/gtdev}

install -d "$bin_dir" "$config_dir"
install -m 0755 "$source_dir/gtdev" "$bin_dir/gtdev"
install -m 0755 "$script_dir/../bin/gtapi.js" "$bin_dir/gtapi"
install -m 0644 "$source_dir/nanorc" "$config_dir/nanorc"
install -m 0644 "$source_dir/gtlua.nanorc" "$config_dir/gtlua.nanorc"

for name in gtstudio gtnew gtedit gtcheck gtbuild gtplay gtrun gtlog; do
    target=$bin_dir/$name
    if [ -e "$target" ] && [ ! -L "$target" ]; then
        echo "refusing to replace non-symlink shortcut: $target" >&2
        exit 1
    fi
    if [ -L "$target" ] && [ "$(readlink "$target")" != gtdev ]; then
        echo "refusing to replace unrelated symlink: $target" >&2
        exit 1
    fi
    ln -sfn gtdev "$target"
done

help_target=$bin_dir/gthelp
if [ -e "$help_target" ] && [ ! -L "$help_target" ]; then
    echo "refusing to replace non-symlink shortcut: $help_target" >&2
    exit 1
fi
if [ -L "$help_target" ] && [ "$(readlink "$help_target")" != gtapi ]; then
    echo "refusing to replace unrelated symlink: $help_target" >&2
    exit 1
fi
ln -sfn gtapi "$help_target"

echo "Installed GameTank Lua shortcuts in $bin_dir"
echo "Installed offline API help as gtapi and gthelp"
echo "Installed dedicated Nano configuration in $config_dir"
