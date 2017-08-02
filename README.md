<h1 align="center">
  <br>
  <img src="/assets/logo/64.png" alt="LolaShare" width="200">
  <br>
  LolaShare
  <br>
  <br>
</h1>


LolaShare is a peer-to-peer audio publishing and streaming application. Think SoundCloud or Spotify, but entirely decentralized and free.

---

**Current Status: LolaShare Network is offline**

Don't be worried! We'll be back online very soon.

Since our initial Alpha release last year, we have made vast improvements to our underlying [peer to peer communication network](https://github.com/ssbc). Armed with the knowledge we have learned in the past year and our improved networking software, we are now taking LolaShare to the next level with a Beta release. 

The Alpha version was using a custom fork of [SSB](https://github.com/ssbc), and we are now in the process to updating to the latest version of SSB. Until we complete this update there is no way for peers to find each other on the network.

If you'd like to help please see our [Contributing](#contributing) section.

---

*a screenshot from our alpha release, codename: Ferment*
<img src="/assets/ferment-screenshot-0.0.0.jpg" alt="Alpha Screenshot" width="888" height="688" />

## Inspiration

The costs associated with running a traditional streaming music site far outweigh the amount of revenue any traditional business model can support (without severely affecting user experience). We can see this now with SoundCloud's high prices and constant advertisements. Other streaming services are losing money every year and are not sustainable.

There is no money in hosting other people's content for free, and these existing music sharing companies need to maintain high revenues to stay in business and keep their investors happy.

Ultimately, this is bad for the users and content creators. There is an implicit tie-in to these services. APIs disappear one-by-one, data formats close up, previous free features are put behind paywalls. You become dependent on these services, and then they change all your favourite features or simply just shut down. 

Our vision is a future where users truly control their own content through socially connected systems which interact on a personal level.

## Who we are

LolaShare is made by a group of like-minded open-source software developers with a common love for making music. 

We wanted to create a free, sustainable, and open solution for original music creators to share and discover new works of music. 

Some of us have been working together on open-source software projects for almost a decade, while others have just recently joined the cause.

## How it works

LolaShare uses a peer-to-peer gossip protocol called [SSB](https://github.com/ssbc). **There is no central server and no single point of failure.** Everyone on the network acts a server, maintaining a copy of all of their friends and their friend's friends data.

LolaShare will gossip ( securely communicate ) with other peers ( your friends ) to find out if any of your shared contacts have posted new materials. All posts are cryptographically proven with an append-only log, ensuring no posts are skipped or lost.

Traditionally, finding peers across a complex network topography ( the internet ) has been a difficult problem. This is why LolaShare uses "pub" servers. A "pub" acts as gossip broker where information can be shared across networks. A "pub" is just an ordinary LolaShare peer which has a publicly accessible IP address and may be remotely connected to on demand. LolaShare will maintain several "main" pubs, ensuring there is always an easy way to connect and begin discovering new music and content creators. Users may also create their own pubs and invite others to join.

The actual audio files are Torrents powered by [webtorrent](webtorrent.io) over the WebRTC protocol. [SSB](github.com/ssbc) is used to propagate messages between peers which contains a link to a magnet url. It sounds complex, but LolaShare is able to present this seamlessly to users through a simple upload form, much like other music sharing sites.

Whenever you listen to audio in LolaShare, you will begin to seed that file with other peers. The audio will be cached on your machine until you remove it, or decide to stop sharing it.

## LolaShare and Copyright

LolaShare is an audio publishing platform for **copyright-owning creators**, **creative commons licensed material**, **remix artists**, and **DJs**. 

Since LolaShare is a decentralized peer-to-peer community, what you curate in your network is up to you. We strongly recommend users abide by the applicable copyright laws of their country.

For example, if someone in your network ( your friends ) added copyrighted material, and you listen to it, your LolaShare will start sharing the file. If you don't want to share the legal responsibility for this, you can right-click and select 'Stop Sharing Post' You should also consider unfollowing them this user and reporting the infringement to the owner of the pub to prevent the spread of the material.

LolaShare itself will **never** host any non-creative commons materials or maintain a directory of links to copyrighted materials. We own no servers, and maintain no music database or trackers containing copyrighted materials.

## Installation

Since we are in the process of making a major network update, we've currently removed installation and build instructions.

We'll be adding cross-platform installation and build instructions back as soon as our Beta version is able to connect to the updated SSB network.

If you are curious, you can view our previous Alpha releases (codename: *Ferment*) for MacOS [here](https://github.com/fermentation/ferment/releases), but it won't be able to connect anywhere since it's using our legacy protocol.

<a name="contributing"></a>
## Contributing to the project

*Updated: 8/2/2017*

We really appreciate the recent support we've been receiving and are actively working on a contribution guide to help enable users to contribute to the project at many levels of involvement.

The easiest way to get involved is to signup for announcements at https://lolashare.com, star the project here on Github, or pledge your support to our [Open Collective](https://opencollective.com/lolashare). 

If you’d like to join the conversation with our developers, you can download the [Patchwork client](https://github.com/ssbc/patchwork), join a [public hub](https://github.com/ssbc/scuttlebot/wiki/Pub-Servers), and find us in the #lolashare room on the SSB network.

## Backers

Support us with a monthly donation and help us continue our activities. [[Become a backer](https://opencollective.com/lolashare#backer)]

<a href="https://opencollective.com/lolashare/backer/0/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/0/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/1/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/1/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/2/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/2/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/3/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/3/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/4/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/4/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/5/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/5/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/6/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/6/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/7/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/7/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/8/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/8/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/9/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/9/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/10/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/10/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/11/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/11/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/12/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/12/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/13/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/13/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/14/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/14/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/15/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/15/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/16/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/16/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/17/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/17/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/18/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/18/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/19/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/19/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/20/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/20/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/21/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/21/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/22/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/22/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/23/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/23/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/24/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/24/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/25/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/25/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/26/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/26/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/27/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/27/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/28/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/28/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/backer/29/website" target="_blank"><img src="https://opencollective.com/lolashare/backer/29/avatar.svg"></a>

## Sponsors

Become a sponsor and get your logo on our README on Github with a link to your site. [[Become a sponsor](https://opencollective.com/lolashare#sponsor)]

<a href="https://opencollective.com/lolashare/sponsor/0/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/1/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/2/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/3/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/4/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/5/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/6/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/7/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/8/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/9/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/9/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/10/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/10/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/11/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/11/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/12/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/12/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/13/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/13/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/14/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/14/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/15/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/15/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/16/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/16/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/17/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/17/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/18/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/18/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/19/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/19/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/20/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/20/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/21/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/21/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/22/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/22/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/23/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/23/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/24/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/24/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/25/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/25/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/26/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/26/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/27/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/27/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/28/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/28/avatar.svg"></a>
<a href="https://opencollective.com/lolashare/sponsor/29/website" target="_blank"><img src="https://opencollective.com/lolashare/sponsor/29/avatar.svg"></a>

## License

GPL-3.0
