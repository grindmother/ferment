# adapted from http://tealscientific.com/blog/?p=2661

# on linux you need to:
# apt-get install autoconf automake build-essential pkg-config

# all platform config and build

export FFSRC=$(pwd)/ffmpeg-src
export FFBLD=$(pwd)/ffmpeg-build

mkdir -p $FFSRC

export PATH=$FFBLD/bin:$PATH
export LD_LIBRARY_PATH=$FFBLD/lib:$LD_LIBRARY_PATH

cd $FFSRC
git clone --depth 1 git://github.com/yasm/yasm.git
cd yasm
autoreconf -fiv
./configure --prefix=$FFBLD
make
make install

cd $FFSRC
wget http://downloads.sourceforge.net/project/lame/lame/3.99/lame-3.99.5.tar.gz
tar xzvf lame-3.99.5.tar.gz
cd lame-3.99.5
./configure --prefix=$FFBLD --enable-static --disable-shared --enable-nasm
make
make install

cd $FFSRC
git clone git://git.opus-codec.org/opus.git
cd opus
autoreconf -fiv
./configure --prefix=$FFBLD --disable-shared --enable-static
make
make install

cd $FFSRC
git clone --depth 1 git://source.ffmpeg.org/ffmpeg
cd ffmpeg
PKG_CONFIG_PATH="$FFBLD/lib/pkgconfig" ./configure --prefix=$FFBLD --extra-cflags="-I$FFBLD/include" --extra-ldflags="-L$FFBLD/lib" \
  --enable-static --disable-shared --disable-all --enable-ffmpeg --enable-avcodec --enable-avformat --enable-avutil \
  --enable-swresample --enable-swscale --enable-avfilter \
  --disable-network --disable-d3d11va --disable-dxva2 --disable-vaapi --disable-vda --disable-vdpau \
  --disable-videotoolbox \
  --enable-libopus \
  --enable-libmp3lame \
  --enable-decoder=mp3 \
  --enable-decoder=aac \
  --enable-decoder=flac \
  --enable-decoder=opus \
  --enable-decoder=vorbis \
  --enable-decoder=pcm_f32le  --enable-decoder=pcm_f64le  --enable-decoder=pcm_s16le  --enable-decoder=pcm_s24le  --enable-decoder=pcm_s32le \
  --enable-demuxer=flac \
  --enable-demuxer=matroska \
  --enable-demuxer=mp3 \
  --enable-demuxer=aiff	\
  --enable-demuxer=ogg \
  --enable-demuxer=wav \
  --enable-demuxer=data \
  --enable-protocol=file \
  --enable-protocol=pipe \
  --disable-bzlib \
  --disable-iconv \
  --disable-libxcb \
  --disable-lzma \
  --disable-sdl \
  --disable-securetransport \
  --disable-xlib \
  --disable-zlib \
  --enable-filter=aresample \
  --enable-encoder=libopus \
  --enable-encoder=libmp3lame \
  --enable-encoder=pcm_s8 \
  --enable-muxer=pcm_s8 \
  --enable-muxer=webm \
  --enable-muxer=mp3 \
  --enable-muxer=segment
make

# build for windows: https://github.com/rdp/ffmpeg-windows-build-helpers
