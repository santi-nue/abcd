<?php

    /**
     * @returns true if $haystack finishes with $needle
     */
    function endsWith( $haystack, $needle ) {
        $length = strlen( $needle );
        if( !$length ) {
            return true;
        }
        return substr( $haystack, -$length ) === $needle;
    }


    /**
     * @returns whether a file is old, i.e. more than 20sec!
     */
    function is_old_file($file) {
        return filemtime($file) < time() - 20;
    }

    /**
     * remove too old files
     */
    function clean() {
        $files = glob('*'); // get all file names
        foreach($files as $file) { // iterate files
        if(is_file($file) && is_old_file($file) && (endsWith($file, ".ly") || endsWith($file, ".pdf") )) {
            unlink($file); // delete file
        }
    }

    }


    ini_set('default_charset', 'UTF-8');
    chdir("scores");

    clean();

    $id = rand();
    unlink("*.pdf");
    $code = substr($_POST["code"], 1);
    file_put_contents("$id.ly", $code, 0);
    $command = escapeshellcmd("lilypond $id.ly");
    system($command);
    echo("scores/$id.pdf")
   
?>
