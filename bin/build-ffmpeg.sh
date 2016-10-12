# on linux you need to:
# sudo apt-get install libopus-dev yasm

# all platform config and build

./configure --enable-static --disable-shared --disable-all --enable-ffmpeg --enable-avcodec --enable-avformat --enable-avutil \
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
  --enable-muxer=segment && make

# build for windows: https://github.com/rdp/ffmpeg-windows-build-helpers
