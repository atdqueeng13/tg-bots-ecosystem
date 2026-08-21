import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.token?.trim();

    if (!token) {
      return NextResponse.json({ error: 'Токен бота не указан' }, { status: 400 });
    }

    // 1. Fetch getMe
    const getMeRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const getMeData = await getMeRes.json();

    if (!getMeData.ok || !getMeData.result) {
      return NextResponse.json(
        { error: getMeData.description || 'Недействительный токен бота Telegram' },
        { status: 400 }
      );
    }

    const botInfo = getMeData.result;
    let avatarUrl: string | null = null;

    // 2. Fetch User Profile Photos
    try {
      const photosRes = await fetch(
        `https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${botInfo.id}&limit=1`
      );
      const photosData = await photosRes.json();

      if (
        photosData.ok &&
        photosData.result?.total_count > 0 &&
        photosData.result.photos?.[0]?.length > 0
      ) {
        // Pick the best resolution photo
        const photoArray = photosData.result.photos[0];
        const bestPhoto = photoArray[photoArray.length - 1];

        // 3. Get File Path
        const fileRes = await fetch(
          `https://api.telegram.org/bot${token}/getFile?file_id=${bestPhoto.file_id}`
        );
        const fileData = await fileRes.json();

        if (fileData.ok && fileData.result?.file_path) {
          // Direct secure image URL via Telegram file server or internal proxy
          avatarUrl = `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`;
        }
      }
    } catch (photoErr) {
      console.warn('Could not fetch bot photo from Telegram:', photoErr);
    }

    return NextResponse.json({
      success: true,
      bot: {
        id: botInfo.id,
        botId: `TG-${botInfo.id}`,
        name: botInfo.first_name + (botInfo.last_name ? ` ${botInfo.last_name}` : ''),
        username: botInfo.username ? `@${botInfo.username}` : '',
        avatarUrl: avatarUrl,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Ошибка подключения к Telegram API' },
      { status: 500 }
    );
  }
}
